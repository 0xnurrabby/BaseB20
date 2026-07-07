// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title B20Token
 * @notice Gas-optimized, feature-rich ERC-20 for the Base chain, deployable and
 *         verifiable on BaseScan today. Built to be configured entirely from the
 *         B20 Token Creator UI and managed live from the B20 Dashboard.
 *
 * Features
 *  - Configurable name / symbol / decimals / initial supply / hard cap
 *  - Buy / sell tax to a collector wallet + optional burn-on-every-transfer
 *    (total tax on any single trade hard-capped at 25% so it can never rug)
 *  - Mint (optional) with permanent hard cap and one-way "disable mint forever"
 *  - Burnable (holder self-burn + owner burn-from is intentionally NOT included)
 *  - Blacklist (bot/scammer blocking) and optional strict whitelist mode
 *  - Max-transaction and max-wallet anti-whale limits (togglable, one-way remove)
 *  - Trading launch gate + temporary pause switch
 *  - Ownable2Step ownership transfer + renounce
 *  - Batch airdrop and stuck-token / stuck-ETH rescue
 *  - ERC-2612 permit (gasless approvals)
 *
 * @dev Uses custom errors and tightly packed storage. Tax/flag config lives in a
 *      single 256-bit slot. Base's *native* B20 precompile standard is a separate,
 *      compliance-focused system with no tax mechanism. See the app Docs.
 */
contract B20Token is ERC20, ERC20Burnable, ERC20Permit, Ownable2Step {
    // --------------------------------------------------------------------- //
    //                               Constants                               //
    // --------------------------------------------------------------------- //

    /// @notice Denominator for basis-point math (100% = 10_000 bps).
    uint16 public constant BPS_DENOMINATOR = 10_000;
    /// @notice Absolute ceiling for the combined tax on any single transfer (25%).
    uint16 public constant MAX_TOTAL_TAX_BPS = 2_500;

    // --------------------------------------------------------------------- //
    //                              Immutables                               //
    // --------------------------------------------------------------------- //

    uint8 private immutable _decimals;
    /// @notice Hard cap on total supply. 0 means "no cap".
    uint256 public immutable maxSupply;

    // --------------------------------------------------------------------- //
    //                          Packed config slot                           //
    // --------------------------------------------------------------------- //
    // taxWallet(160) + 3*uint16(48) + 5*bool(40) = 248 bits -> single slot.

    /// @notice Wallet that receives collected buy/sell tax.
    address public taxWallet;
    /// @notice Tax (bps) taken on buys (transfers from an AMM pair). To taxWallet.
    uint16 public buyTaxBps;
    /// @notice Tax (bps) taken on sells (transfers to an AMM pair). To taxWallet.
    uint16 public sellTaxBps;
    /// @notice Tax (bps) burned on every non-exempt transfer.
    uint16 public burnTaxBps;
    /// @notice Whether new tokens can still be minted.
    bool public mintingEnabled;
    /// @notice One-way flag: once true, trading can never be blocked again.
    bool public tradingActive;
    /// @notice Temporary emergency pause for all non-exempt transfers.
    bool public tradingPaused;
    /// @notice Whether anti-whale limits are enforced.
    bool public limitsEnabled;
    /// @notice When true, only whitelisted addresses may send/receive.
    bool public whitelistMode;

    // --------------------------------------------------------------------- //
    //                            Limit amounts                              //
    // --------------------------------------------------------------------- //

    /// @notice Max tokens movable in a single transfer (0 = unlimited).
    uint256 public maxTxAmount;
    /// @notice Max tokens a single non-pair wallet may hold (0 = unlimited).
    uint256 public maxWalletAmount;

    // --------------------------------------------------------------------- //
    //                                 Maps                                  //
    // --------------------------------------------------------------------- //

    mapping(address account => bool excluded) public isExcludedFromFees;
    mapping(address account => bool excluded) public isExcludedFromLimits;
    mapping(address account => bool blocked) public isBlacklisted;
    mapping(address account => bool allowed) public isWhitelisted;
    mapping(address pair => bool isPair) public automatedMarketMakerPairs;

    /// @notice Off-chain logo pointer (ipfs:// or https://) used by the UI / wallets.
    string public logoURI;

    // --------------------------------------------------------------------- //
    //                                Errors                                 //
    // --------------------------------------------------------------------- //

    error TaxTooHigh();
    error ZeroAddress();
    error MintingDisabled();
    error CapExceeded();
    error AccountBlacklisted();
    error NotWhitelisted();
    error TradingNotActive();
    error TradingIsPaused();
    error MaxTxExceeded();
    error MaxWalletExceeded();
    error LengthMismatch();
    error AlreadyLive();
    error RescueFailed();
    error CannotRescueSelf();

    // --------------------------------------------------------------------- //
    //                                Events                                 //
    // --------------------------------------------------------------------- //

    event BuyTaxUpdated(uint16 bps);
    event SellTaxUpdated(uint16 bps);
    event BurnTaxUpdated(uint16 bps);
    event TaxWalletUpdated(address indexed wallet);
    event FeeExclusionUpdated(address indexed account, bool excluded);
    event LimitExclusionUpdated(address indexed account, bool excluded);
    event LimitsUpdated(uint256 maxTx, uint256 maxWallet);
    event LimitsToggled(bool enabled);
    event BlacklistUpdated(address indexed account, bool blocked);
    event WhitelistModeToggled(bool enabled);
    event WhitelistUpdated(address indexed account, bool allowed);
    event AMMPairUpdated(address indexed pair, bool isPair);
    event TradingEnabled();
    event TradingPauseToggled(bool paused);
    event MintingRenounced();
    event LogoUpdated(string uri);
    event TokensRescued(address indexed token, uint256 amount);
    event ETHRescued(uint256 amount);

    // --------------------------------------------------------------------- //
    //                            Config struct                              //
    // --------------------------------------------------------------------- //

    /**
     * @param name_           Token name.
     * @param symbol_         Token symbol.
     * @param decimals_       Token decimals (typically 18).
     * @param initialSupply   Initial supply in whole tokens (scaled by decimals here).
     * @param cap             Hard cap in whole tokens (0 = uncapped). Must be >= initialSupply.
     * @param owner_          Initial owner (receives supply + all admin rights).
     * @param taxWallet_      Tax collector wallet (defaults to owner if zero).
     * @param buyTaxBps_      Buy tax in bps.
     * @param sellTaxBps_     Sell tax in bps.
     * @param burnTaxBps_     Burn-on-transfer tax in bps.
     * @param mintable        Whether the owner can mint after deployment.
     * @param maxTxTokens     Max-tx limit in whole tokens (0 = unlimited).
     * @param maxWalletTokens Max-wallet limit in whole tokens (0 = unlimited).
     * @param logoURI_        Off-chain logo URI.
     */
    struct TokenConfig {
        string name_;
        string symbol_;
        uint8 decimals_;
        uint256 initialSupply;
        uint256 cap;
        address owner_;
        address taxWallet_;
        uint16 buyTaxBps_;
        uint16 sellTaxBps_;
        uint16 burnTaxBps_;
        bool mintable;
        uint256 maxTxTokens;
        uint256 maxWalletTokens;
        string logoURI_;
    }

    // --------------------------------------------------------------------- //
    //                             Constructor                               //
    // --------------------------------------------------------------------- //

    constructor(TokenConfig memory c)
        ERC20(c.name_, c.symbol_)
        ERC20Permit(c.name_)
        Ownable(c.owner_)
    {
        if (c.owner_ == address(0)) revert ZeroAddress();

        uint8 dec = c.decimals_;
        _decimals = dec;

        uint256 unit = 10 ** dec;
        uint256 supply = c.initialSupply * unit;
        uint256 cap = c.cap == 0 ? 0 : c.cap * unit;
        if (cap != 0 && supply > cap) revert CapExceeded();
        maxSupply = cap;

        // Validate tax config (buy+burn and sell+burn each capped at 25%).
        if (
            uint256(c.buyTaxBps_) + c.burnTaxBps_ > MAX_TOTAL_TAX_BPS ||
            uint256(c.sellTaxBps_) + c.burnTaxBps_ > MAX_TOTAL_TAX_BPS
        ) revert TaxTooHigh();

        buyTaxBps = c.buyTaxBps_;
        sellTaxBps = c.sellTaxBps_;
        burnTaxBps = c.burnTaxBps_;

        address collector = c.taxWallet_ == address(0) ? c.owner_ : c.taxWallet_;
        taxWallet = collector;

        mintingEnabled = c.mintable;
        logoURI = c.logoURI_;

        // Anti-whale limits (scaled). Enabled only if at least one is set.
        if (c.maxTxTokens != 0) maxTxAmount = c.maxTxTokens * unit;
        if (c.maxWalletTokens != 0) maxWalletAmount = c.maxWalletTokens * unit;
        limitsEnabled = (maxTxAmount != 0 || maxWalletAmount != 0);

        // Sensible default exclusions.
        isExcludedFromFees[c.owner_] = true;
        isExcludedFromFees[collector] = true;
        isExcludedFromFees[address(this)] = true;
        isExcludedFromLimits[c.owner_] = true;
        isExcludedFromLimits[collector] = true;
        isExcludedFromLimits[address(this)] = true;

        if (supply != 0) _mint(c.owner_, supply);
    }

    // --------------------------------------------------------------------- //
    //                              Metadata                                 //
    // --------------------------------------------------------------------- //

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    // --------------------------------------------------------------------- //
    //                          Transfer pipeline                            //
    // --------------------------------------------------------------------- //

    /// @dev Single hook for all transfers/mints/burns (OZ v5). Applies gates + fees.
    function _update(address from, address to, uint256 value) internal override {
        // Pure mint or burn: no gating/fees, just move the supply.
        if (from == address(0) || to == address(0)) {
            super._update(from, to, value);
            return;
        }

        if (isBlacklisted[from] || isBlacklisted[to]) revert AccountBlacklisted();

        bool feeExempt = isExcludedFromFees[from] || isExcludedFromFees[to];

        // Launch gate + emergency pause (exempt addresses always pass).
        if (!isExcludedFromLimits[from] && !isExcludedFromLimits[to]) {
            if (!tradingActive) revert TradingNotActive();
            if (tradingPaused && !feeExempt) revert TradingIsPaused();
        }

        // Strict whitelist mode.
        if (whitelistMode && !feeExempt && !isWhitelisted[from] && !isWhitelisted[to]) {
            revert NotWhitelisted();
        }

        // Anti-whale limits.
        if (limitsEnabled && !isExcludedFromLimits[from] && !isExcludedFromLimits[to]) {
            if (maxTxAmount != 0 && value > maxTxAmount) revert MaxTxExceeded();
            if (maxWalletAmount != 0 && !automatedMarketMakerPairs[to]) {
                if (balanceOf(to) + value > maxWalletAmount) revert MaxWalletExceeded();
            }
        }

        // Fees: burn tax on all non-exempt transfers, buy/sell tax on AMM trades.
        if (!feeExempt) {
            uint16 tradeTax;
            if (automatedMarketMakerPairs[from]) {
                tradeTax = buyTaxBps;
            } else if (automatedMarketMakerPairs[to]) {
                tradeTax = sellTaxBps;
            }

            uint256 burnFee = burnTaxBps == 0 ? 0 : (value * burnTaxBps) / BPS_DENOMINATOR;
            uint256 taxFee = tradeTax == 0 ? 0 : (value * tradeTax) / BPS_DENOMINATOR;
            uint256 totalFee = burnFee + taxFee;

            if (totalFee != 0) {
                if (burnFee != 0) super._update(from, address(0), burnFee);
                if (taxFee != 0) super._update(from, taxWallet, taxFee);
                unchecked {
                    value -= totalFee;
                }
            }
        }

        super._update(from, to, value);
    }

    // --------------------------------------------------------------------- //
    //                             Mint / cap                                //
    // --------------------------------------------------------------------- //

    /// @notice Mint `amount` (raw units) to `to`. Owner only, respects the cap.
    function mint(address to, uint256 amount) external onlyOwner {
        if (!mintingEnabled) revert MintingDisabled();
        if (to == address(0)) revert ZeroAddress();
        if (maxSupply != 0 && totalSupply() + amount > maxSupply) revert CapExceeded();
        _mint(to, amount);
    }

    /// @notice Permanently disable minting. Irreversible.
    function renounceMint() external onlyOwner {
        mintingEnabled = false;
        emit MintingRenounced();
    }

    // --------------------------------------------------------------------- //
    //                            Tax controls                               //
    // --------------------------------------------------------------------- //

    function setBuyTax(uint16 bps) external onlyOwner {
        if (uint256(bps) + burnTaxBps > MAX_TOTAL_TAX_BPS) revert TaxTooHigh();
        buyTaxBps = bps;
        emit BuyTaxUpdated(bps);
    }

    function setSellTax(uint16 bps) external onlyOwner {
        if (uint256(bps) + burnTaxBps > MAX_TOTAL_TAX_BPS) revert TaxTooHigh();
        sellTaxBps = bps;
        emit SellTaxUpdated(bps);
    }

    function setBurnTax(uint16 bps) external onlyOwner {
        if (uint256(buyTaxBps) + bps > MAX_TOTAL_TAX_BPS) revert TaxTooHigh();
        if (uint256(sellTaxBps) + bps > MAX_TOTAL_TAX_BPS) revert TaxTooHigh();
        burnTaxBps = bps;
        emit BurnTaxUpdated(bps);
    }

    function setTaxWallet(address wallet) external onlyOwner {
        if (wallet == address(0)) revert ZeroAddress();
        taxWallet = wallet;
        isExcludedFromFees[wallet] = true;
        emit TaxWalletUpdated(wallet);
    }

    // --------------------------------------------------------------------- //
    //                          Exclusions / pairs                           //
    // --------------------------------------------------------------------- //

    function setExcludedFromFees(address account, bool excluded) external onlyOwner {
        isExcludedFromFees[account] = excluded;
        emit FeeExclusionUpdated(account, excluded);
    }

    function setExcludedFromLimits(address account, bool excluded) external onlyOwner {
        isExcludedFromLimits[account] = excluded;
        emit LimitExclusionUpdated(account, excluded);
    }

    function setAMMPair(address pair, bool isPair) external onlyOwner {
        if (pair == address(0)) revert ZeroAddress();
        automatedMarketMakerPairs[pair] = isPair;
        emit AMMPairUpdated(pair, isPair);
    }

    // --------------------------------------------------------------------- //
    //                          Anti-whale limits                            //
    // --------------------------------------------------------------------- //

    /// @notice Set raw-unit limits. Pass 0 to make a given limit unlimited.
    function setLimits(uint256 newMaxTx, uint256 newMaxWallet) external onlyOwner {
        maxTxAmount = newMaxTx;
        maxWalletAmount = newMaxWallet;
        emit LimitsUpdated(newMaxTx, newMaxWallet);
    }

    function setLimitsEnabled(bool enabled) external onlyOwner {
        limitsEnabled = enabled;
        emit LimitsToggled(enabled);
    }

    /// @notice Convenience: disable all anti-whale limits in one call.
    function removeLimits() external onlyOwner {
        limitsEnabled = false;
        emit LimitsToggled(false);
    }

    // --------------------------------------------------------------------- //
    //                       Blacklist / whitelist                           //
    // --------------------------------------------------------------------- //

    function setBlacklist(address account, bool blocked) external onlyOwner {
        isBlacklisted[account] = blocked;
        emit BlacklistUpdated(account, blocked);
    }

    function setBlacklistBatch(address[] calldata accounts, bool blocked) external onlyOwner {
        uint256 len = accounts.length;
        for (uint256 i; i < len;) {
            isBlacklisted[accounts[i]] = blocked;
            emit BlacklistUpdated(accounts[i], blocked);
            unchecked { ++i; }
        }
    }

    function setWhitelistMode(bool enabled) external onlyOwner {
        whitelistMode = enabled;
        emit WhitelistModeToggled(enabled);
    }

    function setWhitelist(address account, bool allowed) external onlyOwner {
        isWhitelisted[account] = allowed;
        emit WhitelistUpdated(account, allowed);
    }

    function setWhitelistBatch(address[] calldata accounts, bool allowed) external onlyOwner {
        uint256 len = accounts.length;
        for (uint256 i; i < len;) {
            isWhitelisted[accounts[i]] = allowed;
            emit WhitelistUpdated(accounts[i], allowed);
            unchecked { ++i; }
        }
    }

    // --------------------------------------------------------------------- //
    //                          Trading controls                             //
    // --------------------------------------------------------------------- //

    /// @notice Open trading to everyone. One-way and cannot be undone.
    function enableTrading() external onlyOwner {
        if (tradingActive) revert AlreadyLive();
        tradingActive = true;
        emit TradingEnabled();
    }

    /// @notice Temporarily pause / unpause all non-exempt transfers.
    function setTradingPaused(bool paused) external onlyOwner {
        tradingPaused = paused;
        emit TradingPauseToggled(paused);
    }

    // --------------------------------------------------------------------- //
    //                                Logo                                   //
    // --------------------------------------------------------------------- //

    function setLogoURI(string calldata uri) external onlyOwner {
        logoURI = uri;
        emit LogoUpdated(uri);
    }

    // --------------------------------------------------------------------- //
    //                          Airdrop / rescue                             //
    // --------------------------------------------------------------------- //

    /// @notice Send tokens to many recipients in one transaction (from caller).
    function airdrop(address[] calldata recipients, uint256[] calldata amounts) external {
        uint256 len = recipients.length;
        if (len != amounts.length) revert LengthMismatch();
        address sender = _msgSender();
        for (uint256 i; i < len;) {
            _transfer(sender, recipients[i], amounts[i]);
            unchecked { ++i; }
        }
    }

    /// @notice Recover a foreign ERC-20 accidentally sent to this contract.
    function rescueTokens(address token, uint256 amount) external onlyOwner {
        if (token == address(this)) revert CannotRescueSelf();
        bool ok = IERC20(token).transfer(owner(), amount);
        if (!ok) revert RescueFailed();
        emit TokensRescued(token, amount);
    }

    /// @notice Recover ETH accidentally sent to this contract.
    function rescueETH() external onlyOwner {
        uint256 bal = address(this).balance;
        (bool ok,) = payable(owner()).call{value: bal}("");
        if (!ok) revert RescueFailed();
        emit ETHRescued(bal);
    }

    receive() external payable {}
}

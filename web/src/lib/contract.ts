import type { Abi } from "viem";
import artifact from "../contracts/B20Token.json";

export const B20_ABI = artifact.abi as Abi;
export const B20_BYTECODE = artifact.bytecode as `0x${string}`;

export const MAX_TOTAL_TAX_BPS = 2500; // 25% hard cap enforced on-chain

/** Constructor config in *whole tokens* (the contract scales by decimals). */
export interface TokenConfigInput {
  name_: string;
  symbol_: string;
  decimals_: number;
  initialSupply: bigint;
  cap: bigint;
  owner_: `0x${string}`;
  taxWallet_: `0x${string}`;
  buyTaxBps_: number;
  sellTaxBps_: number;
  burnTaxBps_: number;
  mintable: boolean;
  maxTxTokens: bigint;
  maxWalletTokens: bigint;
  logoURI_: string;
}

/**
 * Builds the `arguments.js` file contents for `hardhat verify`, matching the
 * TokenConfig struct exactly. bigints are emitted as quoted decimal strings.
 */
export function buildVerifyArgs(cfg: TokenConfigInput): string {
  const tuple = {
    name_: cfg.name_,
    symbol_: cfg.symbol_,
    decimals_: cfg.decimals_,
    initialSupply: cfg.initialSupply.toString(),
    cap: cfg.cap.toString(),
    owner_: cfg.owner_,
    taxWallet_: cfg.taxWallet_,
    buyTaxBps_: cfg.buyTaxBps_,
    sellTaxBps_: cfg.sellTaxBps_,
    burnTaxBps_: cfg.burnTaxBps_,
    mintable: cfg.mintable,
    maxTxTokens: cfg.maxTxTokens.toString(),
    maxWalletTokens: cfg.maxWalletTokens.toString(),
    logoURI_: cfg.logoURI_,
  };
  return `// arguments.js - constructor args for BaseScan verification\nmodule.exports = [\n  ${JSON.stringify(tuple, null, 2).replace(/\n/g, "\n  ")},\n];\n`;
}

/** The exact CLI command to verify a deployed token. */
export function verifyCommand(address: string, network: "base" | "baseSepolia"): string {
  return `npx hardhat verify --network ${network} --constructor-args arguments.js ${address}`;
}

import { useState } from "react";
import { formatUnits } from "viem";
import { useAccount, useBalance, useChainId, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { ACTIVE_CHAINS, DEFAULT_CHAIN_ID, chainName, explorerUrl, getTargetChainId, isSupportedChain, supportedChainNames } from "../lib/wagmi";
import { shortAddress } from "../lib/format";
import { Badge, Button, CopyButton, Divider, Modal } from "./ui";
import { IconAlert, IconChevronDown, IconExternal, IconWallet } from "./icons";

export function WalletConnect() {
  const { address, isConnected, connector } = useAccount();
  const chainId = useChainId();
  const [open, setOpen] = useState(false);

  if (!isConnected || !address) {
    return (
      <>
        <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
          <IconWallet className="h-4 w-4" />
          <span className="hidden sm:inline">Connect Wallet</span>
          <span className="sm:hidden">Connect</span>
        </Button>
        <ConnectModal open={open} onClose={() => setOpen(false)} />
      </>
    );
  }

  const supported = isSupportedChain(chainId);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-2.5 py-1.5 text-sm transition hover:bg-elevated"
      >
        {!supported ? (
          <Badge tone="negative">
            <IconAlert className="h-3 w-3" /> Wrong network
          </Badge>
        ) : (
          <span className="hidden items-center gap-1.5 sm:inline-flex">
            <span className="h-2 w-2 rounded-full bg-positive" />
            <span className="text-xs text-muted">{chainName(chainId)}</span>
          </span>
        )}
        <span className="font-mono text-[13px]">{shortAddress(address)}</span>
        <IconChevronDown className="h-4 w-4 text-muted" />
      </button>
      <AccountModal
        open={open}
        onClose={() => setOpen(false)}
        address={address}
        chainId={chainId}
        connectorName={connector?.name}
      />
    </>
  );
}

function ConnectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { connectors, connect, isPending, error } = useConnect();
  const [pendingId, setPendingId] = useState<string | null>(null);

  // De-duplicate connectors by name (wagmi can surface multiple injected).
  const seen = new Set<string>();
  const list = connectors.filter((c) => {
    if (seen.has(c.name)) return false;
    seen.add(c.name);
    return true;
  });

  return (
    <Modal open={open} onClose={onClose} title="Connect a wallet" size="sm">
      <div className="space-y-2">
        {list.map((c) => (
          <button
            key={c.uid}
            onClick={() => {
              setPendingId(c.uid);
              connect(
                { connector: c, chainId: DEFAULT_CHAIN_ID },
                { onSettled: () => setPendingId(null), onSuccess: () => onClose() }
              );
            }}
            className="flex w-full items-center justify-between rounded-xl border border-border bg-elevated px-4 py-3 text-left transition hover:border-ring"
          >
            <span className="flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface text-fg">
                <IconWallet className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium">{c.name}</span>
            </span>
            {isPending && pendingId === c.uid ? (
              <span className="text-xs text-muted">Connecting...</span>
            ) : null}
          </button>
        ))}
      </div>
      {error && <p className="mt-3 text-xs text-negative">{error.message}</p>}
      <p className="mt-4 text-center text-[11px] text-faint">
        By connecting, you agree to interact with public smart contracts on {supportedChainNames()}. B20 never holds your keys.
      </p>
    </Modal>
  );
}

function AccountModal({
  open,
  onClose,
  address,
  chainId,
  connectorName,
}: {
  open: boolean;
  onClose: () => void;
  address: string;
  chainId: number;
  connectorName?: string;
}) {
  const { disconnect } = useDisconnect();
  const { switchChain, isPending } = useSwitchChain();
  const targetChainId = getTargetChainId(chainId);
  const { data: balance } = useBalance({ address: address as `0x${string}`, chainId: targetChainId });
  const supported = isSupportedChain(chainId);

  return (
    <Modal open={open} onClose={onClose} title="Wallet" size="sm">
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-elevated p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm">{shortAddress(address, 6)}</span>
            <div className="flex items-center gap-1.5">
              <CopyButton value={address} />
              <a
                href={`${explorerUrl(targetChainId)}/address/${address}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-muted hover:text-fg"
              >
                <IconExternal className="h-3.5 w-3.5" /> Scan
              </a>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted">
            <span>{connectorName ?? "Connected"}</span>
            <span>
              {balance ? `${Number(formatUnits(balance.value, balance.decimals)).toFixed(4)} ${balance.symbol}` : "-"}
            </span>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[13px] font-medium">Network</p>
          {!supported && (
            <p className="mb-2 text-xs text-negative">
              You're on an unsupported network. Switch to {supportedChainNames()} to use B20.
            </p>
          )}
          <div className="space-y-2">
            {ACTIVE_CHAINS.map((chain) => (
              <Button
                key={chain.id}
                variant={chainId === chain.id ? "primary" : "outline"}
                size="sm"
                fullWidth
                loading={isPending}
                onClick={() => switchChain({ chainId: chain.id })}
              >
                {chainName(chain.id)}
              </Button>
            ))}
          </div>
        </div>

        <Divider />
        <Button
          variant="danger"
          fullWidth
          onClick={() => {
            disconnect();
            onClose();
          }}
        >
          Disconnect
        </Button>
      </div>
    </Modal>
  );
}

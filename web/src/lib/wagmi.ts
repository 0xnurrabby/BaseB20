import { http, createConfig, createStorage } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";

const mainnetEnabled = import.meta.env.VITE_ENABLE_BASE_MAINNET === "true";

export const CHAINS = { baseSepolia, base } as const;
export const DEFAULT_CHAIN = baseSepolia;
export const DEFAULT_CHAIN_ID = DEFAULT_CHAIN.id;
export type SupportedChainId = typeof baseSepolia.id | typeof base.id;
export const ACTIVE_CHAINS = (mainnetEnabled ? [baseSepolia, base] : [baseSepolia]) as [
  typeof baseSepolia,
  ...Array<typeof base>
];
export const ACTIVE_CHAIN_IDS = ACTIVE_CHAINS.map((chain) => chain.id) as SupportedChainId[];

const EXPLORERS: Record<number, string> = {
  [baseSepolia.id]: "https://sepolia.basescan.org",
  [base.id]: "https://basescan.org",
};

const RPC_URLS: Record<number, string> = {
  [baseSepolia.id]: "https://sepolia.base.org",
  [base.id]: "https://mainnet.base.org",
};

const wcProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID?.trim();

const connectors = [
  injected({ shimDisconnect: true }),
  coinbaseWallet({ appName: "B20 Base Token Studio", preference: "all" }),
  ...(wcProjectId
    ? [
        walletConnect({
          projectId: wcProjectId,
          showQrModal: true,
          metadata: {
            name: "B20 Base Token Creator & Manager",
            description: "Create and manage gas-optimized ERC-20 tokens on Base.",
            url: "https://base.nurlab.xyz",
            icons: [],
          },
        }),
      ]
    : []),
];

export const wagmiConfig = createConfig({
  chains: ACTIVE_CHAINS,
  connectors,
  storage: createStorage({ storage: typeof window !== "undefined" ? window.localStorage : undefined }),
  transports: {
    [baseSepolia.id]: http(RPC_URLS[baseSepolia.id]),
    [base.id]: http(RPC_URLS[base.id]),
  },
});

export function explorerUrl(chainId: number): string {
  return EXPLORERS[chainId] ?? EXPLORERS[DEFAULT_CHAIN_ID];
}

export function chainName(chainId: number): string {
  if (chainId === baseSepolia.id) return "Base Sepolia";
  if (chainId === base.id) return "Base";
  return `Chain ${chainId}`;
}

export function isSupportedChain(chainId: number | undefined): chainId is SupportedChainId {
  return typeof chainId === "number" && (ACTIVE_CHAIN_IDS as readonly number[]).includes(chainId);
}

export function getTargetChainId(chainId: number | undefined): SupportedChainId {
  return isSupportedChain(chainId) ? chainId : DEFAULT_CHAIN_ID;
}

export function supportedChainNames(): string {
  return ACTIVE_CHAINS.map((chain) => chainName(chain.id)).join(" or ");
}

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}

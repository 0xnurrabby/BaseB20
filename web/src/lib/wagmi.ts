import { http, createConfig, createStorage } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";

export const CHAINS = { baseSepolia } as const;

export const DEFAULT_CHAIN_ID = baseSepolia.id;

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
            description: "Create and manage gas-optimized ERC-20 tokens on Base Sepolia.",
            url: "https://base.org",
            icons: [],
          },
        }),
      ]
    : []),
];

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors,
  storage: createStorage({ storage: typeof window !== "undefined" ? window.localStorage : undefined }),
  transports: {
    [baseSepolia.id]: http("https://sepolia.base.org"),
  },
});

export function explorerUrl(_chainId: number): string {
  return "https://sepolia.basescan.org";
}

export function chainName(chainId: number): string {
  if (chainId === baseSepolia.id) return "Base Sepolia";
  return `Chain ${chainId}`;
}

export function isSupportedChain(chainId: number | undefined): boolean {
  return chainId === baseSepolia.id;
}

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}

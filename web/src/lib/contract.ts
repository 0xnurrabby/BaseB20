import {
  encodeAbiParameters,
  encodeFunctionData,
  keccak256,
  toHex,
  zeroAddress,
  type Abi,
} from "viem";

export const B20_FACTORY_ADDRESS = "0xB20f000000000000000000000000000000000000" as const;
export const POLICY_REGISTRY_ADDRESS = "0x8453000000000000000000000000000000000002" as const;
export const ACTIVATION_REGISTRY_ADDRESS = "0x8453000000000000000000000000000000000001" as const;

export const B20_VARIANT_ASSET = 0;
export const B20_CREATE_PARAMS_VERSION = 1;
export const MIN_ASSET_DECIMALS = 6;
export const MAX_ASSET_DECIMALS = 18;
export const MAX_UINT128 = (1n << 128n) - 1n;
export const WAD_PRECISION = 10n ** 18n;

const ZERO_ROLE = `0x${"0".repeat(64)}` as const;
const roleHash = (role: string) => keccak256(toHex(role));

export const B20_ROLES = {
  DEFAULT_ADMIN_ROLE: ZERO_ROLE,
  MINT_ROLE: roleHash("MINT_ROLE"),
  BURN_ROLE: roleHash("BURN_ROLE"),
  BURN_BLOCKED_ROLE: roleHash("BURN_BLOCKED_ROLE"),
  PAUSE_ROLE: roleHash("PAUSE_ROLE"),
  UNPAUSE_ROLE: roleHash("UNPAUSE_ROLE"),
  METADATA_ROLE: roleHash("METADATA_ROLE"),
  OPERATOR_ROLE: roleHash("OPERATOR_ROLE"),
} as const;

export const ROLE_OPTIONS = [
  { key: "DEFAULT_ADMIN_ROLE", label: "Default admin", role: B20_ROLES.DEFAULT_ADMIN_ROLE },
  { key: "MINT_ROLE", label: "Mint", role: B20_ROLES.MINT_ROLE },
  { key: "BURN_ROLE", label: "Burn", role: B20_ROLES.BURN_ROLE },
  { key: "BURN_BLOCKED_ROLE", label: "Burn blocked", role: B20_ROLES.BURN_BLOCKED_ROLE },
  { key: "PAUSE_ROLE", label: "Pause", role: B20_ROLES.PAUSE_ROLE },
  { key: "UNPAUSE_ROLE", label: "Unpause", role: B20_ROLES.UNPAUSE_ROLE },
  { key: "METADATA_ROLE", label: "Metadata", role: B20_ROLES.METADATA_ROLE },
  { key: "OPERATOR_ROLE", label: "Operator", role: B20_ROLES.OPERATOR_ROLE },
] as const;

export const PAUSABLE_FEATURES = [
  { value: 0, label: "Transfers" },
  { value: 1, label: "Minting" },
  { value: 2, label: "Burning" },
] as const;

export const B20_FACTORY_ABI = [
  {
    type: "function",
    name: "createB20",
    stateMutability: "payable",
    inputs: [
      { name: "variant", type: "uint8" },
      { name: "salt", type: "bytes32" },
      { name: "params", type: "bytes" },
      { name: "initCalls", type: "bytes[]" },
    ],
    outputs: [{ name: "token", type: "address" }],
  },
  {
    type: "function",
    name: "getB20Address",
    stateMutability: "view",
    inputs: [
      { name: "variant", type: "uint8" },
      { name: "sender", type: "address" },
      { name: "salt", type: "bytes32" },
    ],
    outputs: [{ name: "token", type: "address" }],
  },
  {
    type: "function",
    name: "isB20",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [{ name: "ok", type: "bool" }],
  },
  {
    type: "function",
    name: "isB20Initialized",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [{ name: "ok", type: "bool" }],
  },
  {
    type: "event",
    name: "B20Created",
    inputs: [
      { name: "token", type: "address", indexed: true },
      { name: "variant", type: "uint8", indexed: true },
      { name: "name", type: "string", indexed: false },
      { name: "symbol", type: "string", indexed: false },
      { name: "decimals", type: "uint8", indexed: false },
      { name: "variantEventParams", type: "bytes", indexed: false },
    ],
  },
] as const satisfies Abi;

export const B20_ABI = [
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "supplyCap", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "contractURI", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "hasRole", stateMutability: "view", inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "isPaused", stateMutability: "view", inputs: [{ name: "feature", type: "uint8" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "extraMetadata", stateMutability: "view", inputs: [{ name: "key", type: "string" }], outputs: [{ type: "string" }] },
  { type: "function", name: "multiplier", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "transfer", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "mintWithMemo", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }, { name: "memo", type: "bytes32" }], outputs: [] },
  { type: "function", name: "batchMint", stateMutability: "nonpayable", inputs: [{ name: "recipients", type: "address[]" }, { name: "amounts", type: "uint256[]" }], outputs: [] },
  { type: "function", name: "burn", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "burnWithMemo", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }, { name: "memo", type: "bytes32" }], outputs: [] },
  { type: "function", name: "updateSupplyCap", stateMutability: "nonpayable", inputs: [{ name: "newSupplyCap", type: "uint256" }], outputs: [] },
  { type: "function", name: "updateName", stateMutability: "nonpayable", inputs: [{ name: "newName", type: "string" }], outputs: [] },
  { type: "function", name: "updateSymbol", stateMutability: "nonpayable", inputs: [{ name: "newSymbol", type: "string" }], outputs: [] },
  { type: "function", name: "updateContractURI", stateMutability: "nonpayable", inputs: [{ name: "newURI", type: "string" }], outputs: [] },
  { type: "function", name: "updateExtraMetadata", stateMutability: "nonpayable", inputs: [{ name: "key", type: "string" }, { name: "value", type: "string" }], outputs: [] },
  { type: "function", name: "updateMultiplier", stateMutability: "nonpayable", inputs: [{ name: "newMultiplier", type: "uint256" }], outputs: [] },
  { type: "function", name: "grantRole", stateMutability: "nonpayable", inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }], outputs: [] },
  { type: "function", name: "revokeRole", stateMutability: "nonpayable", inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }], outputs: [] },
  { type: "function", name: "renounceRole", stateMutability: "nonpayable", inputs: [{ name: "role", type: "bytes32" }, { name: "callerConfirmation", type: "address" }], outputs: [] },
  { type: "function", name: "renounceLastAdmin", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "pause", stateMutability: "nonpayable", inputs: [{ name: "features", type: "uint8[]" }], outputs: [] },
  { type: "function", name: "unpause", stateMutability: "nonpayable", inputs: [{ name: "features", type: "uint8[]" }], outputs: [] },
  { type: "function", name: "transferWithMemo", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }, { name: "memo", type: "bytes32" }], outputs: [{ type: "bool" }] },
] as const satisfies Abi;

export interface B20CreateConfig {
  name: string;
  symbol: string;
  decimals: number;
  admin: `0x${string}`;
  initialSupply: bigint;
  supplyCap: bigint;
  contractURI: string;
  logoURI: string;
  grantMinter: boolean;
  grantPauser: boolean;
  grantMetadata: boolean;
  grantOperator: boolean;
}

export function encodeAssetCreateParams(config: Pick<B20CreateConfig, "name" | "symbol" | "admin" | "decimals">) {
  return encodeAbiParameters(
    [
      {
        type: "tuple",
        components: [
          { name: "version", type: "uint8" },
          { name: "name", type: "string" },
          { name: "symbol", type: "string" },
          { name: "initialAdmin", type: "address" },
          { name: "decimals", type: "uint8" },
        ],
      },
    ],
    [{
      version: B20_CREATE_PARAMS_VERSION,
      name: config.name,
      symbol: config.symbol,
      initialAdmin: config.admin,
      decimals: config.decimals,
    }]
  );
}

export function buildB20InitCalls(config: B20CreateConfig): `0x${string}`[] {
  const calls: `0x${string}`[] = [
    encodeFunctionData({ abi: B20_ABI, functionName: "updateSupplyCap", args: [config.supplyCap] }),
  ];

  const grants: Array<readonly [`0x${string}`, boolean]> = [
    [B20_ROLES.MINT_ROLE, config.grantMinter],
    [B20_ROLES.PAUSE_ROLE, config.grantPauser],
    [B20_ROLES.UNPAUSE_ROLE, config.grantPauser],
    [B20_ROLES.METADATA_ROLE, config.grantMetadata],
    [B20_ROLES.OPERATOR_ROLE, config.grantOperator],
  ];

  for (const [role, enabled] of grants) {
    if (enabled) {
      calls.push(encodeFunctionData({ abi: B20_ABI, functionName: "grantRole", args: [role, config.admin] }));
    }
  }

  if (config.contractURI.trim()) {
    calls.push(encodeFunctionData({ abi: B20_ABI, functionName: "updateContractURI", args: [config.contractURI.trim()] }));
  }

  if (config.logoURI.trim()) {
    calls.push(encodeFunctionData({ abi: B20_ABI, functionName: "updateExtraMetadata", args: ["logoURI", config.logoURI.trim()] }));
  }

  if (config.initialSupply > 0n) {
    calls.push(encodeFunctionData({ abi: B20_ABI, functionName: "batchMint", args: [[config.admin], [config.initialSupply]] }));
  }

  return calls;
}

export function randomSalt(seed: string) {
  const entropy =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
  return keccak256(toHex(`${seed}:${entropy}`));
}

export function isNoCap(cap: bigint) {
  return cap === MAX_UINT128;
}

export { zeroAddress };

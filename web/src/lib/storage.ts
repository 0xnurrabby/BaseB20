/** Persisted registry of tokens the user has created / imported, per chain. */

export interface SavedToken {
  address: string;
  name: string;
  symbol: string;
  chainId: number;
  createdAt: number;
  deployer?: string;
  txHash?: string;
}

const KEY = "b20.tokens.v1";

function readAll(): SavedToken[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(list: SavedToken[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function getSavedTokens(chainId?: number): SavedToken[] {
  const all = readAll().sort((a, b) => b.createdAt - a.createdAt);
  return chainId ? all.filter((t) => t.chainId === chainId) : all;
}

export function saveToken(token: SavedToken) {
  const all = readAll();
  const idx = all.findIndex(
    (t) => t.address.toLowerCase() === token.address.toLowerCase() && t.chainId === token.chainId
  );
  if (idx >= 0) all[idx] = { ...all[idx], ...token };
  else all.push(token);
  writeAll(all);
}

export function removeToken(address: string, chainId: number) {
  const all = readAll().filter(
    (t) => !(t.address.toLowerCase() === address.toLowerCase() && t.chainId === chainId)
  );
  writeAll(all);
}

import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Represents a TikTok account with proxy and OpenAI API key.
 */
export interface TikTokAccount {
  id: string;
  nickname: string;
  proxy: string;
  openaiApiKey: string;
  createdAt: string;
  updatedAt: string;
}

const ACCOUNTS_FILE = resolve(process.cwd(), 'accounts.json');

let accounts: TikTokAccount[] = [];

/**
 * Load accounts from disk.
 */
export function loadAccounts(): void {
  try {
    if (existsSync(ACCOUNTS_FILE)) {
      const raw = readFileSync(ACCOUNTS_FILE, 'utf-8');
      const data = JSON.parse(raw);
      accounts = Array.isArray(data) ? data : [];
    }
  } catch {
    accounts = [];
  }
}

/**
 * Persist accounts to disk.
 */
function persist(): void {
  try {
    writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), 'utf-8');
  } catch {
    // Non-fatal
  }
}

/**
 * Get all accounts.
 */
export function getAccounts(): TikTokAccount[] {
  return [...accounts];
}

/**
 * Get a single account by ID.
 */
export function getAccount(id: string): TikTokAccount | null {
  return accounts.find(a => a.id === id) || null;
}

/**
 * Add a new account.
 */
export function addAccount(nickname: string, proxy: string, openaiApiKey: string): TikTokAccount {
  const account: TikTokAccount = {
    id: randomUUID(),
    nickname: nickname.trim(),
    proxy: proxy.trim(),
    openaiApiKey: openaiApiKey.trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  accounts.push(account);
  persist();
  return account;
}

/**
 * Update an existing account.
 */
export function updateAccount(
  id: string,
  updates: Partial<Pick<TikTokAccount, 'nickname' | 'proxy' | 'openaiApiKey'>>
): TikTokAccount | null {
  const account = accounts.find(a => a.id === id);
  if (!account) return null;

  if (updates.nickname !== undefined) account.nickname = updates.nickname.trim();
  if (updates.proxy !== undefined) account.proxy = updates.proxy.trim();
  if (updates.openaiApiKey !== undefined) account.openaiApiKey = updates.openaiApiKey.trim();
  account.updatedAt = new Date().toISOString();

  persist();
  return account;
}

/**
 * Delete an account by ID.
 */
export function deleteAccount(id: string): boolean {
  const idx = accounts.findIndex(a => a.id === id);
  if (idx === -1) return false;
  accounts.splice(idx, 1);
  persist();
  return true;
}

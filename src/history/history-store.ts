import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * A single history entry for a completed project run.
 */
export interface HistoryEntry {
  id: string;
  timestamp: string;
  projectId: string;
  projectName: string;
  videoUrl: string;
  commentUsed: string;
  accountNickname: string;
  status: 'completed' | 'failed';
  details: string;
}

const HISTORY_FILE = resolve(process.cwd(), 'project-history.json');

let history: HistoryEntry[] = [];

/**
 * Load history from disk.
 */
export function loadHistory(): void {
  try {
    if (existsSync(HISTORY_FILE)) {
      const raw = readFileSync(HISTORY_FILE, 'utf-8');
      const data = JSON.parse(raw);
      history = Array.isArray(data) ? data : [];
    }
  } catch {
    history = [];
  }
}

/**
 * Persist history to disk.
 */
function persist(): void {
  try {
    writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
  } catch {
    // Non-fatal
  }
}

/**
 * Add a history entry.
 */
export function addHistoryEntry(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): HistoryEntry {
  const newEntry: HistoryEntry = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    ...entry,
  };
  history.unshift(newEntry);

  // Keep max 500 entries
  if (history.length > 500) {
    history = history.slice(0, 500);
  }

  persist();
  return newEntry;
}

/**
 * Get paginated history entries with optional filters.
 */
export function getHistory(
  page: number = 1,
  perPage: number = 25,
  statusFilter: string = 'all',
  projectFilter: string = 'all'
): { entries: HistoryEntry[]; total: number; page: number; totalPages: number } {
  let filtered = history;

  if (statusFilter && statusFilter !== 'all') {
    filtered = filtered.filter(h => h.status === statusFilter);
  }
  if (projectFilter && projectFilter !== 'all') {
    filtered = filtered.filter(h => h.projectId === projectFilter);
  }

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const start = (safePage - 1) * perPage;
  const entries = filtered.slice(start, start + perPage);

  return { entries, total, page: safePage, totalPages };
}

/**
 * Get all history entries (unfiltered).
 */
export function getAllHistory(): HistoryEntry[] {
  return [...history];
}

/**
 * Clear all history.
 */
export function clearHistory(): void {
  history = [];
  persist();
}

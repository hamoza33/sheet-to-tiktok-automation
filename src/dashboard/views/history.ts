import { layout } from './layout.js';
import type { HistoryEntry } from '../../history/history-store.js';
import type { Project } from '../../projects/project-manager.js';

interface HistoryPageData {
  entries: HistoryEntry[];
  total: number;
  page: number;
  totalPages: number;
  statusFilter: string;
  projectFilter: string;
  projects: Project[];
}

export function historyPage(data: HistoryPageData): string {
  const { entries, total, page, totalPages, statusFilter, projectFilter, projects } = data;

  const projectOptions = projects.map(p =>
    `<option value="${p.id}" ${projectFilter === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`
  ).join('');

  const rows = entries.map(entry => `
    <tr>
      <td style="font-size: 0.85rem; color: #8888a0;">${formatDateTime(entry.timestamp)}</td>
      <td style="font-size: 0.85rem; color: #e0e0e0;">${escapeHtml(entry.projectName)}</td>
      <td style="max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        <a href="${escapeHtml(entry.videoUrl)}" target="_blank" style="color: #e94560; text-decoration: none; font-size: 0.85rem;">${escapeHtml(entry.videoUrl.substring(0, 40))}...</a>
      </td>
      <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.85rem; color: #e0e0e0;">${escapeHtml(entry.commentUsed || '-')}</td>
      <td style="font-size: 0.85rem; color: #e0e0e0;">🎭 ${escapeHtml(entry.accountNickname)}</td>
      <td><span class="badge badge-${entry.status === 'completed' ? 'success' : 'failed'}">${entry.status}</span></td>
      <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.8rem; color: #8888a0;">${escapeHtml(entry.details)}</td>
    </tr>
  `).join('');

  // Pagination links
  let paginationHtml = '';
  if (totalPages > 1) {
    const links: string[] = [];
    if (page > 1) {
      links.push(`<a href="/history?page=${page - 1}&status=${statusFilter}&project=${projectFilter}">← Prev</a>`);
    }
    for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) {
      if (i === page) {
        links.push(`<span class="current">${i}</span>`);
      } else {
        links.push(`<a href="/history?page=${i}&status=${statusFilter}&project=${projectFilter}">${i}</a>`);
      }
    }
    if (page < totalPages) {
      links.push(`<a href="/history?page=${page + 1}&status=${statusFilter}&project=${projectFilter}">Next →</a>`);
    }
    paginationHtml = `<div class="pagination">${links.join('')}</div>`;
  }

  return layout({
    title: 'History',
    activePage: 'history',
    content: `
      <div class="container">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h1 style="font-size: 1.5rem; color: #fff;">Project History</h1>
            <p style="color: #8888a0; font-size: 0.85rem;">${total} total entries</p>
          </div>
        </div>

        <!-- Filters -->
        <div class="card" style="margin-bottom: 1.5rem; padding: 1rem;">
          <form method="GET" action="/history" style="display: flex; gap: 1rem; align-items: end; flex-wrap: wrap;">
            <div class="form-group" style="margin-bottom: 0; min-width: 150px;">
              <label for="filter-status">Status</label>
              <select name="status" id="filter-status">
                <option value="all" ${statusFilter === 'all' ? 'selected' : ''}>All</option>
                <option value="completed" ${statusFilter === 'completed' ? 'selected' : ''}>Completed</option>
                <option value="failed" ${statusFilter === 'failed' ? 'selected' : ''}>Failed</option>
              </select>
            </div>
            <div class="form-group" style="margin-bottom: 0; min-width: 150px;">
              <label for="filter-project">Project</label>
              <select name="project" id="filter-project">
                <option value="all" ${projectFilter === 'all' ? 'selected' : ''}>All Projects</option>
                ${projectOptions}
              </select>
            </div>
            <button type="submit" class="btn btn-secondary" style="padding: 0.5rem 1rem;">🔍 Filter</button>
          </form>
        </div>

        <!-- History Table -->
        <div class="card">
          ${entries.length > 0 ? `
            <div style="overflow-x: auto;">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Project</th>
                    <th>Video</th>
                    <th>Comment Used</th>
                    <th>Account</th>
                    <th>Status</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
            ${paginationHtml}
          ` : `
            <p style="color: #8888a0; text-align: center; padding: 3rem;">No history entries yet. Run a project to see results here.</p>
          `}
        </div>
      </div>
    `,
  });
}

function formatDateTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

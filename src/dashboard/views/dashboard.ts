import { layout } from './layout.js';
import type { ActivityEntry, ServiceStats } from '../activity-store.js';

export function dashboardPage(stats: ServiceStats, recentActivities: ActivityEntry[]): string {
  const statusColor = stats.serviceState === 'running'
    ? 'green'
    : stats.serviceState === 'paused'
      ? 'yellow'
      : 'red';

  const statusLabel = stats.serviceState.charAt(0).toUpperCase() + stats.serviceState.slice(1);

  const uptime = getUptime(stats.startTime);
  const totalProcessed = stats.successCount + stats.errorCount + stats.failedCount;
  const successRate = totalProcessed > 0
    ? Math.round((stats.successCount / totalProcessed) * 100)
    : 100;

  const lastPoll = stats.lastPollTime
    ? formatTime(stats.lastPollTime)
    : 'Never';

  const activityRows = recentActivities.map(a => `
    <tr>
      <td style="font-size: 0.85rem; color: #8888a0;">${formatTime(a.timestamp)}</td>
      <td>#${a.rowNumber}</td>
      <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(a.caption.substring(0, 50))}</td>
      <td><span class="badge badge-${a.status}">${a.status}</span></td>
    </tr>
  `).join('');

  return layout({
    title: 'Dashboard',
    activePage: 'dashboard',
    content: `
      <div class="container">
        <!-- Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h1 style="font-size: 1.5rem; color: #fff;">Dashboard</h1>
            <p style="color: #8888a0; font-size: 0.9rem;">
              <span class="status-dot status-${statusColor}"></span>
              Service ${statusLabel}
            </p>
          </div>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <form method="POST" action="/api/control" style="display:inline;">
              <input type="hidden" name="action" value="start">
              <button type="submit" class="btn btn-success" ${stats.serviceState === 'running' ? 'disabled' : ''}>▶ Start</button>
            </form>
            <form method="POST" action="/api/control" style="display:inline;">
              <input type="hidden" name="action" value="stop">
              <button type="submit" class="btn btn-danger" ${stats.serviceState === 'stopped' ? 'disabled' : ''}>⏹ Stop</button>
            </form>
            <form method="POST" action="/api/control" style="display:inline;">
              <input type="hidden" name="action" value="poll_now">
              <button type="submit" class="btn btn-secondary">🔄 Poll Now</button>
            </form>
          </div>
        </div>

        <!-- Workflow Visualization -->
        <div class="card" style="margin-bottom: 1.5rem;">
          <div class="card-title">Workflow</div>
          <div style="display: flex; align-items: center; justify-content: center; gap: 1rem; padding: 1.5rem 0; flex-wrap: wrap;">
            <div style="background: #1a1a2e; border: 2px solid #0f3460; border-radius: 12px; padding: 1rem 1.5rem; text-align: center; min-width: 140px;">
              <div style="font-size: 1.5rem;">📊</div>
              <div style="font-size: 0.85rem; color: #fff; margin-top: 0.25rem;">Google Sheets</div>
              <div style="font-size: 0.75rem; color: #8888a0;">Source</div>
            </div>
            <div style="color: #e94560; font-size: 1.5rem;">→</div>
            <div style="background: #1a1a2e; border: 2px solid #e94560; border-radius: 12px; padding: 1rem 1.5rem; text-align: center; min-width: 140px;">
              <div style="font-size: 1.5rem;">⚙️</div>
              <div style="font-size: 0.85rem; color: #fff; margin-top: 0.25rem;">Process & Validate</div>
              <div style="font-size: 0.75rem; color: #8888a0;">Automation</div>
            </div>
            <div style="color: #e94560; font-size: 1.5rem;">→</div>
            <div style="background: #1a1a2e; border: 2px solid #0f3460; border-radius: 12px; padding: 1rem 1.5rem; text-align: center; min-width: 140px;">
              <div style="font-size: 1.5rem;">🎵</div>
              <div style="font-size: 0.85rem; color: #fff; margin-top: 0.25rem;">Buffer / TikTok</div>
              <div style="font-size: 0.75rem; color: #8888a0;">Destination</div>
            </div>
          </div>
        </div>

        <!-- Stats Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
          <div class="card">
            <div class="card-title">Last Poll</div>
            <div style="font-size: 1.3rem; color: #fff;">${lastPoll}</div>
          </div>
          <div class="card">
            <div class="card-title">Rows Processed Today</div>
            <div style="font-size: 1.3rem; color: #fff;">${stats.rowsProcessedToday}</div>
          </div>
          <div class="card">
            <div class="card-title">Success Rate</div>
            <div style="font-size: 1.3rem; color: ${successRate >= 80 ? '#28a745' : successRate >= 50 ? '#ffc107' : '#dc3545'};">${successRate}%</div>
          </div>
          <div class="card">
            <div class="card-title">Uptime</div>
            <div style="font-size: 1.3rem; color: #fff;">${uptime}</div>
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="card">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
            <div class="card-title" style="margin-bottom: 0;">Recent Activity</div>
            <a href="/activity" class="btn btn-secondary" style="font-size: 0.8rem; padding: 0.4rem 0.8rem;">View All</a>
          </div>
          ${recentActivities.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Row</th>
                  <th>Caption</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>${activityRows}</tbody>
            </table>
          ` : `
            <p style="color: #8888a0; text-align: center; padding: 2rem;">No activity yet. The service will log entries here as it processes rows.</p>
          `}
        </div>
      </div>
    `,
  });
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function getUptime(startTime: string): string {
  const diff = Date.now() - new Date(startTime).getTime();
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

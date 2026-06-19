import { layout } from './layout.js';

export interface SettingsData {
  sheetId: string;
  worksheetName: string;
  bufferAccessToken: string;
  bufferChannelId: string;
  pollingInterval: number;
  googleServiceAccountJson: string;
  dashboardPassword: string;
}

export function settingsPage(data: SettingsData, message?: { type: 'success' | 'error'; text: string }): string {
  const toastHtml = message
    ? `<div class="toast toast-${message.type}">${escapeHtml(message.text)}</div>`
    : '';

  return layout({
    title: 'Settings',
    activePage: 'settings',
    content: `
      ${toastHtml}
      <div class="container">
        <div style="margin-bottom: 1.5rem;">
          <h1 style="font-size: 1.5rem; color: #fff;">Settings</h1>
          <p style="color: #8888a0; font-size: 0.85rem;">Configure your automation service</p>
        </div>

        <form method="POST" action="/api/settings" id="settings-form">
          <div class="card" style="margin-bottom: 1.5rem;">
            <div class="card-title" style="margin-bottom: 1rem;">Google Sheets Configuration</div>
            
            <div class="form-group">
              <label for="sheetId">Sheet ID</label>
              <input type="text" id="sheetId" name="sheetId" value="${escapeHtml(data.sheetId)}" placeholder="Your Google Sheet ID">
            </div>

            <div class="form-group">
              <label for="worksheetName">Worksheet Name</label>
              <input type="text" id="worksheetName" name="worksheetName" value="${escapeHtml(data.worksheetName)}" placeholder="Sheet tab name">
            </div>

            <div class="form-group">
              <label for="googleServiceAccountJson">Google Service Account JSON</label>
              <textarea id="googleServiceAccountJson" name="googleServiceAccountJson" rows="4" placeholder="Paste service account JSON here">${escapeHtml(data.googleServiceAccountJson)}</textarea>
            </div>
          </div>

          <div class="card" style="margin-bottom: 1.5rem;">
            <div class="card-title" style="margin-bottom: 1rem;">Buffer Configuration</div>
            
            <div class="form-group">
              <label for="bufferAccessToken">Buffer Access Token</label>
              <input type="password" id="bufferAccessToken" name="bufferAccessToken" value="${escapeHtml(data.bufferAccessToken)}" placeholder="Your Buffer access token">
            </div>

            <div class="form-group">
              <label for="bufferChannelId">Buffer Channel ID</label>
              <input type="text" id="bufferChannelId" name="bufferChannelId" value="${escapeHtml(data.bufferChannelId)}" placeholder="Buffer TikTok channel ID">
            </div>
          </div>

          <div class="card" style="margin-bottom: 1.5rem;">
            <div class="card-title" style="margin-bottom: 1rem;">Service Configuration</div>
            
            <div class="form-group">
              <label for="pollingInterval">Polling Interval (seconds)</label>
              <input type="number" id="pollingInterval" name="pollingInterval" value="${data.pollingInterval}" min="10" max="300" step="1">
              <small style="color: #8888a0; font-size: 0.75rem;">How often to check for new rows (10-300 seconds)</small>
            </div>

            <div class="form-group">
              <label for="dashboardPassword">Dashboard Password</label>
              <input type="password" id="dashboardPassword" name="dashboardPassword" value="${escapeHtml(data.dashboardPassword)}" placeholder="Dashboard login password">
            </div>
          </div>

          <div style="display: flex; gap: 0.75rem;">
            <button type="submit" class="btn btn-primary">💾 Save & Restart</button>
            <a href="/" class="btn btn-secondary">Cancel</a>
          </div>
        </form>
      </div>

      <script>
        // Enhance form with JS fetch for better UX
        const form = document.getElementById('settings-form');
        if (form) {
          form.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(form);
            const body = new URLSearchParams();
            for (const [key, value] of formData.entries()) {
              body.append(key, value.toString());
            }
            try {
              const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: body.toString(),
              });
              const data = await res.json();
              showToast(data.success ? 'success' : 'error', data.message || (data.success ? 'Settings saved!' : 'Error saving settings'));
            } catch (err) {
              showToast('error', 'Network error saving settings');
            }
          });
        }

        function showToast(type, message) {
          const existing = document.querySelector('.toast');
          if (existing) existing.remove();
          const toast = document.createElement('div');
          toast.className = 'toast toast-' + type;
          toast.textContent = message;
          document.body.appendChild(toast);
          setTimeout(() => toast.remove(), 4000);
        }
      </script>
    `,
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

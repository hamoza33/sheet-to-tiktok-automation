import { layout } from './layout.js';
import type { WorkflowState } from '../../workflows/workflow-manager.js';
import { DEFAULT_GOOGLE_CREDENTIALS_JSON } from '../../workflows/workflow-manager.js';

export function workflowsPage(
  workflows: WorkflowState[],
  message?: { type: 'success' | 'error'; text: string }
): string {
  const toastHtml = message
    ? `<div class="toast toast-${message.type}">${escapeHtml(message.text)}</div>`
    : '';

  const workflowCards = workflows.map(wf => workflowCard(wf)).join('');

  return layout({
    title: 'Workflows',
    activePage: 'workflows',
    content: `
      ${toastHtml}
      <div class="container">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h1 style="font-size: 1.5rem; color: #fff;">Workflows</h1>
            <p style="color: #8888a0; font-size: 0.85rem;">Manage your workflows</p>
          </div>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <button onclick="exportAllWorkflows()" class="btn btn-secondary">📥 Export All</button>
            <button onclick="document.getElementById('import-file-input').click()" class="btn btn-secondary">📤 Import All</button>
            <input type="file" id="import-file-input" accept=".json" style="display: none;" onchange="importAllWorkflows(event)">
            <button onclick="showNewForm()" class="btn btn-primary">➕ New Workflow</button>
          </div>
        </div>

        <!-- New/Edit Workflow Form (hidden by default) -->
        <div id="workflow-form-container" style="display: none; margin-bottom: 1.5rem;">
          <div class="card">
            <div class="card-title" style="margin-bottom: 1rem;" id="form-title">New Workflow</div>
            <form id="workflow-form" onsubmit="submitWorkflow(event)">
              <input type="hidden" id="form-workflow-id" value="">
              
              <div class="form-group">
                <label for="wf-name">Workflow Name</label>
                <input type="text" id="wf-name" required placeholder="e.g., My Workflow">
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group">
                  <label for="wf-sheetId">Google Sheet ID</label>
                  <input type="text" id="wf-sheetId" required placeholder="Sheet ID from URL">
                </div>
                <div class="form-group">
                  <label for="wf-worksheetName">Worksheet Name</label>
                  <input type="text" id="wf-worksheetName" required value="Sheet1" placeholder="Tab name">
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group">
                  <label for="wf-bufferAccessToken">Buffer Access Token</label>
                  <div style="position: relative;">
                    <input type="password" id="wf-bufferAccessToken" required placeholder="Buffer API token" style="padding-right: 2.5rem;">
                    <button type="button" onclick="toggleTokenVisibility()" id="toggle-token-btn" style="position: absolute; right: 0.5rem; top: 50%; transform: translateY(-50%); background: none; border: none; color: #a0a0b0; cursor: pointer; font-size: 1.1rem; padding: 0.25rem;" title="Toggle visibility">
                      <span id="eye-icon">👁</span>
                    </button>
                  </div>
                </div>
                <div class="form-group">
                  <label for="wf-bufferChannelId">Buffer Channel ID</label>
                  <input type="text" id="wf-bufferChannelId" required placeholder="Buffer channel/profile ID">
                </div>
              </div>

              <div class="form-group">
                <label for="wf-pollingInterval">Polling Interval (seconds)</label>
                <input type="number" id="wf-pollingInterval" value="60" min="10" max="300" step="1">
                <small style="color: #8888a0; font-size: 0.75rem;">10-300 seconds</small>
              </div>

              <div class="form-group">
                <label for="wf-credentials">Google Service Account JSON</label>
                <textarea id="wf-credentials" rows="5" required placeholder="Paste full service account JSON here"></textarea>
              </div>

              <div style="display: flex; gap: 0.75rem;">
                <button type="submit" class="btn btn-primary">💾 Save Workflow</button>
                <button type="button" onclick="hideForm()" class="btn btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Workflow Cards Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 1rem;">
          ${workflowCards || '<p style="color: #8888a0; grid-column: 1/-1; text-align: center; padding: 3rem;">No workflows configured yet. Click "New Workflow" to get started.</p>'}
        </div>
      </div>

      <script>
        const DEFAULT_CREDENTIALS_PREFILL = ${JSON.stringify(DEFAULT_GOOGLE_CREDENTIALS_JSON)};

        function toggleTokenVisibility() {
          const input = document.getElementById('wf-bufferAccessToken');
          const icon = document.getElementById('eye-icon');
          if (input.type === 'password') {
            input.type = 'text';
            icon.textContent = '🙈';
          } else {
            input.type = 'password';
            icon.textContent = '👁';
          }
        }

        function showNewForm() {
          document.getElementById('form-workflow-id').value = '';
          document.getElementById('form-title').textContent = 'New Workflow';
          document.getElementById('workflow-form').reset();
          document.getElementById('wf-pollingInterval').value = '60';
          document.getElementById('wf-worksheetName').value = 'Sheet1';
          document.getElementById('wf-credentials').value = DEFAULT_CREDENTIALS_PREFILL;
          document.getElementById('wf-credentials').required = true;
          document.getElementById('wf-credentials').placeholder = 'Paste full service account JSON here';
          document.getElementById('wf-bufferAccessToken').type = 'password';
          document.getElementById('eye-icon').textContent = '👁';
          document.getElementById('workflow-form-container').style.display = 'block';
          document.getElementById('wf-name').focus();
        }

        function hideForm() {
          document.getElementById('wf-bufferAccessToken').type = 'password';
          document.getElementById('eye-icon').textContent = '👁';
          document.getElementById('workflow-form-container').style.display = 'none';
        }

        function editWorkflow(id) {
          fetch('/api/workflows/' + id)
            .then(r => r.json())
            .then(wf => {
              document.getElementById('wf-bufferAccessToken').type = 'password';
              document.getElementById('eye-icon').textContent = '👁';
              document.getElementById('form-workflow-id').value = wf.id;
              document.getElementById('form-title').textContent = 'Edit Workflow';
              document.getElementById('wf-name').value = wf.name;
              document.getElementById('wf-sheetId').value = wf.sheetId;
              document.getElementById('wf-worksheetName').value = wf.worksheetName;
              document.getElementById('wf-bufferAccessToken').value = wf.bufferAccessToken || '';
              document.getElementById('wf-bufferChannelId').value = wf.bufferChannelId;
              document.getElementById('wf-pollingInterval').value = wf.pollingIntervalSeconds;
              document.getElementById('wf-credentials').value = '';
              document.getElementById('wf-credentials').required = false;
              document.getElementById('wf-credentials').placeholder = 'Leave empty to keep current credentials';
              document.getElementById('workflow-form-container').style.display = 'block';
              document.getElementById('wf-name').focus();
            })
            .catch(() => showToast('error', 'Failed to load workflow'));
        }

        async function submitWorkflow(e) {
          e.preventDefault();
          const id = document.getElementById('form-workflow-id').value;
          const body = {
            name: document.getElementById('wf-name').value,
            sheetId: document.getElementById('wf-sheetId').value,
            worksheetName: document.getElementById('wf-worksheetName').value,
            bufferAccessToken: document.getElementById('wf-bufferAccessToken').value,
            bufferChannelId: document.getElementById('wf-bufferChannelId').value,
            pollingIntervalSeconds: parseInt(document.getElementById('wf-pollingInterval').value) || 60,
            googleCredentialsJson: document.getElementById('wf-credentials').value,
            enabled: true,
          };

          const url = id ? '/api/workflows/' + id : '/api/workflows';
          const method = id ? 'PUT' : 'POST';

          try {
            const res = await fetch(url, {
              method,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            });
            const data = await res.json();
            if (res.ok) {
              showToast('success', id ? 'Workflow updated!' : 'Workflow created!');
              setTimeout(() => location.reload(), 1000);
            } else {
              showToast('error', data.message || 'Failed to save workflow');
            }
          } catch {
            showToast('error', 'Network error');
          }
        }

        async function deleteWorkflow(id, name) {
          if (!confirm('Delete workflow "' + name + '"? This cannot be undone.')) return;
          try {
            const res = await fetch('/api/workflows/' + id, { method: 'DELETE' });
            if (res.ok) {
              showToast('success', 'Workflow deleted');
              setTimeout(() => location.reload(), 1000);
            } else {
              showToast('error', 'Failed to delete workflow');
            }
          } catch {
            showToast('error', 'Network error');
          }
        }

        async function duplicateWorkflow(id) {
          try {
            const res = await fetch('/api/workflows/' + id + '/duplicate', { method: 'POST' });
            if (res.ok) {
              showToast('success', 'Workflow duplicated!');
              setTimeout(() => location.reload(), 1000);
            } else {
              const data = await res.json();
              showToast('error', data.message || 'Failed to duplicate workflow');
            }
          } catch {
            showToast('error', 'Network error');
          }
        }

        async function controlWorkflow(id, action) {
          try {
            const res = await fetch('/api/workflows/' + id + '/' + action, { method: 'POST' });
            if (res.ok) {
              showToast('success', 'Action "' + action + '" executed');
              setTimeout(() => location.reload(), 1000);
            } else {
              const data = await res.json();
              showToast('error', data.message || 'Action failed');
            }
          } catch {
            showToast('error', 'Network error');
          }
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

        async function exportAllWorkflows() {
          try {
            const res = await fetch('/api/workflows/export');
            if (!res.ok) {
              showToast('error', 'Failed to export workflows');
              return;
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'workflows-export.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('success', 'Workflows exported!');
          } catch {
            showToast('error', 'Network error during export');
          }
        }

        async function importAllWorkflows(event) {
          const file = event.target.files[0];
          if (!file) return;

          try {
            const text = await file.text();
            const workflows = JSON.parse(text);

            if (!Array.isArray(workflows)) {
              showToast('error', 'Invalid file: expected a JSON array of workflows');
              event.target.value = '';
              return;
            }

            const res = await fetch('/api/workflows/import', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(workflows),
            });

            const data = await res.json();
            if (res.ok) {
              showToast('success', data.message || 'Workflows imported!');
              setTimeout(() => location.reload(), 1500);
            } else {
              showToast('error', data.message || 'Failed to import workflows');
            }
          } catch {
            showToast('error', 'Failed to read or parse the import file');
          }

          event.target.value = '';
        }
      </script>
    `,
  });
}

function workflowCard(wf: WorkflowState): string {
  const statusColor = wf.status === 'running' ? 'green' : wf.status === 'error' ? 'red' : 'yellow';
  const statusLabel = wf.status.charAt(0).toUpperCase() + wf.status.slice(1);
  const lastPoll = wf.lastPollTime ? formatTime(wf.lastPollTime) : 'Never';

  return `
    <div class="card">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span class="status-dot status-${statusColor}"></span>
          <strong style="color: #fff; font-size: 1rem;">${escapeHtml(wf.name)}</strong>
        </div>
        <span style="font-size: 0.75rem; color: #8888a0; background: #1a1a2e; padding: 0.2rem 0.5rem; border-radius: 4px;">${statusLabel}</span>
      </div>

      <div style="font-size: 0.8rem; color: #8888a0; margin-bottom: 0.75rem;">
        <div>Sheet: <span style="color: #e0e0e0;">${escapeHtml(wf.sheetId.substring(0, 20))}...</span></div>
        <div>Tab: <span style="color: #e0e0e0;">${escapeHtml(wf.worksheetName)}</span></div>
        <div>Last Poll: <span style="color: #e0e0e0;">${lastPoll}</span></div>
        <div>Processed: <span style="color: #e0e0e0;">${wf.processedCount} rows</span></div>
        <div>Interval: <span style="color: #e0e0e0;">${wf.pollingIntervalSeconds}s</span></div>
        ${wf.errorMessage ? `<div style="color: #dc3545; margin-top: 0.25rem;">⚠️ ${escapeHtml(wf.errorMessage.substring(0, 80))}</div>` : ''}
      </div>

      <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
        ${wf.status !== 'running' ? `<button onclick="controlWorkflow('${wf.id}', 'start')" class="btn btn-success" style="padding: 0.3rem 0.7rem; font-size: 0.8rem;">▶ Start</button>` : ''}
        ${wf.status === 'running' ? `<button onclick="controlWorkflow('${wf.id}', 'stop')" class="btn btn-danger" style="padding: 0.3rem 0.7rem; font-size: 0.8rem;">⏹ Stop</button>` : ''}
        <button onclick="controlWorkflow('${wf.id}', 'poll')" class="btn btn-secondary" style="padding: 0.3rem 0.7rem; font-size: 0.8rem;">🔄 Poll</button>
        <button onclick="editWorkflow('${wf.id}')" class="btn btn-secondary" style="padding: 0.3rem 0.7rem; font-size: 0.8rem;">✏️ Edit</button>
        <button onclick="duplicateWorkflow('${wf.id}')" class="btn btn-secondary" style="padding: 0.3rem 0.7rem; font-size: 0.8rem;">📋 Duplicate</button>
        <button onclick="deleteWorkflow('${wf.id}', '${escapeHtml(wf.name)}')" class="btn btn-danger" style="padding: 0.3rem 0.7rem; font-size: 0.8rem;">🗑️</button>
      </div>
    </div>
  `;
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

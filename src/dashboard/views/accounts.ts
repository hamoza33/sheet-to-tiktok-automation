import { layout } from './layout.js';
import type { TikTokAccount } from '../../accounts/account-manager.js';

export function accountsPage(
  accounts: TikTokAccount[],
  message?: { type: 'success' | 'error'; text: string }
): string {
  const toastHtml = message
    ? `<div class="toast toast-${message.type}">${escapeHtml(message.text)}</div>`
    : '';

  const accountCards = accounts.map(acc => accountCard(acc)).join('');

  return layout({
    title: 'Accounts',
    activePage: 'accounts',
    content: `
      ${toastHtml}
      <div class="container">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h1 style="font-size: 1.5rem; color: #fff;">TikTok Accounts</h1>
            <p style="color: #8888a0; font-size: 0.85rem;">Manage your TikTok accounts with proxies and OpenAI keys</p>
          </div>
          <button onclick="showNewAccountForm()" class="btn btn-primary">➕ Add Account</button>
        </div>

        <!-- New/Edit Account Form -->
        <div id="account-form-container" style="display: none; margin-bottom: 1.5rem;">
          <div class="card">
            <div class="card-title" style="margin-bottom: 1rem;" id="account-form-title">New Account</div>
            <form id="account-form" onsubmit="submitAccount(event)">
              <input type="hidden" id="form-account-id" value="">
              
              <div class="form-group">
                <label for="acc-nickname">Nickname</label>
                <input type="text" id="acc-nickname" required placeholder="e.g., Main Account, Business Account">
              </div>

              <div class="form-group">
                <label for="acc-proxy">Proxy</label>
                <input type="text" id="acc-proxy" placeholder="e.g., http://user:pass@host:port or socks5://host:port">
                <small style="color: #8888a0; font-size: 0.75rem;">Format: protocol://user:pass@host:port (leave empty for no proxy)</small>
              </div>

              <div class="form-group">
                <label for="acc-openai-key">OpenAI API Key</label>
                <input type="password" id="acc-openai-key" required placeholder="sk-...">
                <small style="color: #8888a0; font-size: 0.75rem;">Used to generate comments via GPT</small>
              </div>

              <div style="display: flex; gap: 0.75rem;">
                <button type="submit" class="btn btn-primary">💾 Save Account</button>
                <button type="button" onclick="hideAccountForm()" class="btn btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Account Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1rem;">
          ${accountCards || '<p style="color: #8888a0; grid-column: 1/-1; text-align: center; padding: 3rem;">No accounts added yet. Click "Add Account" to get started.</p>'}
        </div>
      </div>

      <script>
        function showNewAccountForm() {
          document.getElementById('form-account-id').value = '';
          document.getElementById('account-form-title').textContent = 'New Account';
          document.getElementById('account-form').reset();
          document.getElementById('account-form-container').style.display = 'block';
          document.getElementById('acc-nickname').focus();
        }

        function hideAccountForm() {
          document.getElementById('account-form-container').style.display = 'none';
        }

        function editAccount(id) {
          fetch('/api/accounts/' + id)
            .then(r => r.json())
            .then(acc => {
              document.getElementById('form-account-id').value = acc.id;
              document.getElementById('account-form-title').textContent = 'Edit Account';
              document.getElementById('acc-nickname').value = acc.nickname;
              document.getElementById('acc-proxy').value = acc.proxy;
              document.getElementById('acc-openai-key').value = acc.openaiApiKey;
              document.getElementById('acc-openai-key').required = false;
              document.getElementById('account-form-container').style.display = 'block';
              document.getElementById('acc-nickname').focus();
            })
            .catch(() => showToast('error', 'Failed to load account'));
        }

        async function submitAccount(e) {
          e.preventDefault();
          const id = document.getElementById('form-account-id').value;
          const body = {
            nickname: document.getElementById('acc-nickname').value,
            proxy: document.getElementById('acc-proxy').value,
            openaiApiKey: document.getElementById('acc-openai-key').value,
          };

          const url = id ? '/api/accounts/' + id : '/api/accounts';
          const method = id ? 'PUT' : 'POST';

          try {
            const res = await fetch(url, {
              method,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            });
            const data = await res.json();
            if (res.ok) {
              showToast('success', id ? 'Account updated!' : 'Account added!');
              setTimeout(() => location.reload(), 1000);
            } else {
              showToast('error', data.message || 'Failed to save account');
            }
          } catch {
            showToast('error', 'Network error');
          }
        }

        async function deleteAccount(id, nickname) {
          if (!confirm('Delete account "' + nickname + '"? This cannot be undone.')) return;
          try {
            const res = await fetch('/api/accounts/' + id, { method: 'DELETE' });
            if (res.ok) {
              showToast('success', 'Account deleted');
              setTimeout(() => location.reload(), 1000);
            } else {
              showToast('error', 'Failed to delete account');
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
      </script>
    `,
  });
}

function accountCard(acc: TikTokAccount): string {
  const maskedKey = acc.openaiApiKey
    ? acc.openaiApiKey.substring(0, 7) + '...' + acc.openaiApiKey.slice(-4)
    : 'Not set';

  return `
    <div class="card">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
        <strong style="color: #fff; font-size: 1rem;">🎭 ${escapeHtml(acc.nickname)}</strong>
      </div>

      <div style="font-size: 0.8rem; color: #8888a0; margin-bottom: 0.75rem;">
        <div>Proxy: <span style="color: #e0e0e0;">${acc.proxy ? escapeHtml(acc.proxy) : '<em>None</em>'}</span></div>
        <div>OpenAI Key: <span style="color: #e0e0e0;">${escapeHtml(maskedKey)}</span></div>
        <div>Added: <span style="color: #e0e0e0;">${formatDate(acc.createdAt)}</span></div>
      </div>

      <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
        <button onclick="editAccount('${acc.id}')" class="btn btn-secondary" style="padding: 0.3rem 0.7rem; font-size: 0.8rem;">✏️ Edit</button>
        <button onclick="deleteAccount('${acc.id}', '${escapeHtml(acc.nickname)}')" class="btn btn-danger" style="padding: 0.3rem 0.7rem; font-size: 0.8rem;">🗑️ Delete</button>
      </div>
    </div>
  `;
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
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

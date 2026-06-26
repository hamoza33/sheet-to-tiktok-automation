import { layout } from './layout.js';

export function settingsPage(): string {
  return layout({
    title: 'Settings',
    activePage: 'settings',
    content: `
      <div class="container">
        <div style="margin-bottom: 1.5rem;">
          <h1 style="font-size: 1.5rem; color: #fff;">Settings</h1>
          <p style="color: #8888a0; font-size: 0.85rem;">Buffer API Tester</p>
        </div>

        <div class="card" style="margin-bottom: 1.5rem;">
          <div class="card-title" style="margin-bottom: 1rem;">Test Buffer Connection</div>

          <div class="form-group">
            <label for="bufferToken">Buffer Access Token</label>
            <input type="password" id="bufferToken" placeholder="Enter your Buffer access token" style="width: 100%;">
          </div>

          <button id="testBtn" class="btn btn-primary" style="margin-top: 0.5rem;">Test Connection</button>
        </div>

        <div id="results" style="display: none;">
          <div class="card">
            <div class="card-title" style="margin-bottom: 1rem;">Results</div>
            <div id="results-content"></div>
          </div>
        </div>
      </div>

      <script>
        const testBtn = document.getElementById('testBtn');
        const tokenInput = document.getElementById('bufferToken');
        const resultsDiv = document.getElementById('results');
        const resultsContent = document.getElementById('results-content');

        testBtn.addEventListener('click', async function() {
          const accessToken = tokenInput.value.trim();
          if (!accessToken) {
            showError('Please enter a Buffer access token.');
            return;
          }

          testBtn.disabled = true;
          testBtn.textContent = 'Testing...';
          resultsDiv.style.display = 'none';

          try {
            const res = await fetch('/api/buffer-test', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accessToken }),
            });
            const data = await res.json();

            if (data.success && data.data) {
              showSuccess(data.data);
            } else {
              showError(data.error || 'Connection test failed.');
            }
          } catch (err) {
            showError('Network error: ' + err.message);
          } finally {
            testBtn.disabled = false;
            testBtn.textContent = 'Test Connection';
          }
        });

        function showSuccess(account) {
          let channelsHtml = '';
          if (account.channels && account.channels.length > 0) {
            channelsHtml = '<table style="margin-top: 1rem; width: 100%;"><thead><tr><th>ID</th><th>Name</th><th>Service</th></tr></thead><tbody>';
            account.channels.forEach(function(ch) {
              channelsHtml += '<tr><td>' + escapeHtml(ch.id) + '</td><td>' + escapeHtml(ch.name) + '</td><td>' + escapeHtml(ch.service) + '</td></tr>';
            });
            channelsHtml += '</tbody></table>';
          } else {
            channelsHtml = '<p style="color: #8888a0; margin-top: 1rem;">No channels found.</p>';
          }

          resultsContent.innerHTML =
            '<div style="color: #4caf50; margin-bottom: 0.75rem; font-weight: 600;">Connection Successful</div>' +
            '<p style="color: #e0e0e0; margin-bottom: 0.25rem;"><strong>Account ID:</strong> ' + escapeHtml(account.id) + '</p>' +
            '<p style="color: #e0e0e0; margin-bottom: 0.25rem;"><strong>Email:</strong> ' + escapeHtml(account.email) + '</p>' +
            '<div style="margin-top: 0.75rem;"><strong style="color: #e0e0e0;">Channels:</strong></div>' +
            channelsHtml;

          resultsDiv.style.display = 'block';
        }

        function showError(message) {
          resultsContent.innerHTML = '<div style="color: #e94560; font-weight: 600;">Connection Failed</div><p style="color: #e0e0e0; margin-top: 0.5rem;">' + escapeHtml(message) + '</p>';
          resultsDiv.style.display = 'block';
        }

        function escapeHtml(str) {
          if (!str) return '';
          return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        }
      </script>
    `,
  });
}

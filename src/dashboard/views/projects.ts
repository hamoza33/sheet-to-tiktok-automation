import { layout } from './layout.js';
import type { Project } from '../../projects/project-manager.js';
import type { TikTokAccount } from '../../accounts/account-manager.js';

export function projectsPage(
  projects: Project[],
  accounts: TikTokAccount[],
  message?: { type: 'success' | 'error'; text: string }
): string {
  const toastHtml = message
    ? `<div class="toast toast-${message.type}">${escapeHtml(message.text)}</div>`
    : '';

  const accountOptions = accounts.map(a =>
    `<option value="${a.id}">${escapeHtml(a.nickname)}</option>`
  ).join('');

  const projectCards = projects.map(p => projectCard(p, accounts)).join('');

  return layout({
    title: 'Projects',
    activePage: 'projects',
    content: `
      ${toastHtml}
      <div class="container">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h1 style="font-size: 1.5rem; color: #fff;">Projects</h1>
            <p style="color: #8888a0; font-size: 0.85rem;">Create projects to auto-comment on TikTok videos</p>
          </div>
          <button onclick="showNewProjectForm()" class="btn btn-primary">➕ New Project</button>
        </div>

        <!-- New/Edit Project Form -->
        <div id="project-form-container" style="display: none; margin-bottom: 1.5rem;">
          <div class="card">
            <div class="card-title" style="margin-bottom: 1rem;" id="project-form-title">New Project</div>
            <form id="project-form" onsubmit="submitProject(event)">
              <input type="hidden" id="form-project-id" value="">
              
              <div class="form-group">
                <label for="proj-name">Project Name</label>
                <input type="text" id="proj-name" required placeholder="e.g., Promote new video">
              </div>

              <div class="form-group">
                <label for="proj-videoUrl">TikTok Video URL</label>
                <input type="url" id="proj-videoUrl" required placeholder="https://www.tiktok.com/@user/video/...">
              </div>

              <div class="form-group">
                <label for="proj-commentTemplate">Comment Template / Style</label>
                <textarea id="proj-commentTemplate" rows="4" required placeholder="Describe the comment style or provide examples. e.g.: 'Engaging, positive comments about the product. Mention how useful it is. Use emojis.'"></textarea>
                <small style="color: #8888a0; font-size: 0.75rem;">This will be sent to OpenAI to generate unique comments each run</small>
              </div>

              <div class="form-group">
                <label for="proj-accountId">TikTok Account</label>
                <select id="proj-accountId" required>
                  <option value="">-- Select Account --</option>
                  ${accountOptions}
                </select>
                ${accounts.length === 0 ? '<small style="color: #ffc107; font-size: 0.75rem;">⚠️ No accounts added. <a href="/accounts" style="color: #e94560;">Add one first</a></small>' : ''}
              </div>

              <div style="display: flex; gap: 0.75rem;">
                <button type="submit" class="btn btn-primary">💾 Save Project</button>
                <button type="button" onclick="hideProjectForm()" class="btn btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Project Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 1rem;">
          ${projectCards || '<p style="color: #8888a0; grid-column: 1/-1; text-align: center; padding: 3rem;">No projects created yet. Click "New Project" to get started.</p>'}
        </div>
      </div>

      <script>
        function showNewProjectForm() {
          document.getElementById('form-project-id').value = '';
          document.getElementById('project-form-title').textContent = 'New Project';
          document.getElementById('project-form').reset();
          document.getElementById('project-form-container').style.display = 'block';
          document.getElementById('proj-name').focus();
        }

        function hideProjectForm() {
          document.getElementById('project-form-container').style.display = 'none';
        }

        function editProject(id) {
          fetch('/api/projects/' + id)
            .then(r => r.json())
            .then(proj => {
              document.getElementById('form-project-id').value = proj.id;
              document.getElementById('project-form-title').textContent = 'Edit Project';
              document.getElementById('proj-name').value = proj.name;
              document.getElementById('proj-videoUrl').value = proj.videoUrl;
              document.getElementById('proj-commentTemplate').value = proj.commentTemplate;
              document.getElementById('proj-accountId').value = proj.accountId;
              document.getElementById('project-form-container').style.display = 'block';
              document.getElementById('proj-name').focus();
            })
            .catch(() => showToast('error', 'Failed to load project'));
        }

        async function submitProject(e) {
          e.preventDefault();
          const id = document.getElementById('form-project-id').value;
          const body = {
            name: document.getElementById('proj-name').value,
            videoUrl: document.getElementById('proj-videoUrl').value,
            commentTemplate: document.getElementById('proj-commentTemplate').value,
            accountId: document.getElementById('proj-accountId').value,
          };

          const url = id ? '/api/projects/' + id : '/api/projects';
          const method = id ? 'PUT' : 'POST';

          try {
            const res = await fetch(url, {
              method,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            });
            const data = await res.json();
            if (res.ok) {
              showToast('success', id ? 'Project updated!' : 'Project created!');
              setTimeout(() => location.reload(), 1000);
            } else {
              showToast('error', data.message || 'Failed to save project');
            }
          } catch {
            showToast('error', 'Network error');
          }
        }

        async function runProject(id) {
          const btn = event.target;
          btn.disabled = true;
          btn.textContent = '⏳ Running...';
          try {
            const res = await fetch('/api/projects/' + id + '/run', { method: 'POST' });
            const data = await res.json();
            if (res.ok && data.success) {
              showToast('success', data.message || 'Project ran successfully!');
            } else {
              showToast('error', data.message || 'Project run failed');
            }
            setTimeout(() => location.reload(), 1500);
          } catch {
            showToast('error', 'Network error');
            btn.disabled = false;
            btn.textContent = '▶ Run';
          }
        }

        async function deleteProject(id, name) {
          if (!confirm('Delete project "' + name + '"? This cannot be undone.')) return;
          try {
            const res = await fetch('/api/projects/' + id, { method: 'DELETE' });
            if (res.ok) {
              showToast('success', 'Project deleted');
              setTimeout(() => location.reload(), 1000);
            } else {
              showToast('error', 'Failed to delete project');
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

function projectCard(project: Project, accounts: TikTokAccount[]): string {
  const account = accounts.find(a => a.id === project.accountId);
  const accountName = account ? account.nickname : 'Unknown';

  const statusColor = project.status === 'completed' ? 'green'
    : project.status === 'running' ? 'yellow'
    : project.status === 'failed' ? 'red'
    : 'yellow';

  const statusLabel = project.status.charAt(0).toUpperCase() + project.status.slice(1);
  const lastRun = project.lastRunAt ? formatDateTime(project.lastRunAt) : 'Never';

  return `
    <div class="card">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
        <strong style="color: #fff; font-size: 1rem;">📋 ${escapeHtml(project.name)}</strong>
        <span style="font-size: 0.75rem; color: #8888a0; background: #1a1a2e; padding: 0.2rem 0.5rem; border-radius: 4px;">
          <span class="status-dot status-${statusColor}" style="margin-right: 0.25rem;"></span>${statusLabel}
        </span>
      </div>

      <div style="font-size: 0.8rem; color: #8888a0; margin-bottom: 0.75rem;">
        <div>Video: <a href="${escapeHtml(project.videoUrl)}" target="_blank" style="color: #e94560; text-decoration: none;">${escapeHtml(project.videoUrl.substring(0, 45))}...</a></div>
        <div>Account: <span style="color: #e0e0e0;">🎭 ${escapeHtml(accountName)}</span></div>
        <div>Template: <span style="color: #e0e0e0;">${escapeHtml(project.commentTemplate.substring(0, 60))}${project.commentTemplate.length > 60 ? '...' : ''}</span></div>
        <div>Comments Posted: <span style="color: #e0e0e0;">${project.commentsPosted}</span></div>
        <div>Last Run: <span style="color: #e0e0e0;">${lastRun}</span></div>
      </div>

      <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
        <button onclick="runProject('${project.id}')" class="btn btn-success" style="padding: 0.3rem 0.7rem; font-size: 0.8rem;">▶ Run</button>
        <button onclick="editProject('${project.id}')" class="btn btn-secondary" style="padding: 0.3rem 0.7rem; font-size: 0.8rem;">✏️ Edit</button>
        <button onclick="deleteProject('${project.id}', '${escapeHtml(project.name)}')" class="btn btn-danger" style="padding: 0.3rem 0.7rem; font-size: 0.8rem;">🗑️ Delete</button>
      </div>
    </div>
  `;
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

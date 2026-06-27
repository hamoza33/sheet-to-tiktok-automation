import { layout } from './layout.js';

export function loginPage(error?: string): string {
  const errorHtml = error
    ? `<div class="toast toast-error">${error}</div>`
    : '';

  return layout({
    title: 'Login',
    activePage: 'login',
    showNav: false,
    content: `
      ${errorHtml}
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh;">
        <div class="card" style="width: 100%; max-width: 400px;">
          <div style="text-align: center; margin-bottom: 1.5rem;">
            <span style="font-size: 2.5rem;">⚡</span>
            <h1 style="font-size: 1.3rem; margin-top: 0.5rem; color: #fff;">Zap2</h1>
            <p style="color: #8888a0; font-size: 0.85rem; margin-top: 0.25rem;">Sign in to your dashboard</p>
          </div>
          <form method="POST" action="/login">
            <div class="form-group">
              <label for="password">Password</label>
              <input type="password" id="password" name="password" placeholder="Enter dashboard password" required autofocus>
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%;">Sign In</button>
          </form>
        </div>
      </div>
    `,
  });
}

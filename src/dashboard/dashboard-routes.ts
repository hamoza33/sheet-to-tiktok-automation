import { Router, type Request, type Response } from 'express';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  requireAuth,
  getDashboardPassword,
  createSession,
  setSessionCookie,
  clearSessionCookie,
  parseCookies,
  destroySession,
} from './auth.js';
import {
  getActivities,
  getRecentActivities,
  getStats,
  setServiceState,
  loadActivities,
} from './activity-store.js';
import { loginPage } from './views/login.js';
import { dashboardPage } from './views/dashboard.js';
import { activityPage } from './views/activity.js';
import { settingsPage, type SettingsData } from './views/settings.js';

// Initialize the activity store from disk
loadActivities();

/**
 * Creates the dashboard Express Router with all routes.
 */
export function createDashboardRouter(): Router {
  const router = Router();

  // --- Body parsing for form submissions ---
  // Use express built-in URL-encoded parser
  router.use((req: Request, _res: Response, next) => {
    // Express 5 doesn't auto-parse body; we need to use express.urlencoded
    next();
  });

  // ─── Public Routes ────────────────────────────────────────────────────────────

  router.get('/login', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(loginPage());
  });

  router.post('/login', (req: Request, res: Response) => {
    const body = req.body as Record<string, string> | undefined;
    const password = body?.password || '';

    if (password === getDashboardPassword()) {
      const token = createSession();
      setSessionCookie(res, token);
      res.redirect('/');
    } else {
      res.setHeader('Content-Type', 'text/html');
      res.status(401).send(loginPage('Invalid password. Please try again.'));
    }
  });

  router.get('/logout', (req: Request, res: Response) => {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies['dashboard_session'];
    if (token) {
      destroySession(token);
    }
    clearSessionCookie(res);
    res.redirect('/login');
  });

  // ─── Protected Routes ─────────────────────────────────────────────────────────

  // Dashboard home
  router.get('/', requireAuth, (_req: Request, res: Response) => {
    const stats = getStats();
    const recent = getRecentActivities(5);
    res.setHeader('Content-Type', 'text/html');
    res.send(dashboardPage(stats, recent));
  });

  // Activity log page
  router.get('/activity', requireAuth, (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const status = (req.query.status as string) || 'all';
    const data = getActivities(page, 25, status);
    res.setHeader('Content-Type', 'text/html');
    res.send(activityPage({ ...data, statusFilter: status }));
  });

  // Settings page
  router.get('/settings', requireAuth, (req: Request, res: Response) => {
    const data = loadCurrentSettings();
    const msg = req.query.saved === '1'
      ? { type: 'success' as const, text: 'Settings saved successfully!' }
      : req.query.error
        ? { type: 'error' as const, text: String(req.query.error) }
        : undefined;
    res.setHeader('Content-Type', 'text/html');
    res.send(settingsPage(data, msg));
  });

  // ─── API Endpoints ────────────────────────────────────────────────────────────

  // GET /api/status
  router.get('/api/status', requireAuth, (_req: Request, res: Response) => {
    const stats = getStats();
    const uptime = Math.floor((Date.now() - new Date(stats.startTime).getTime()) / 1000);
    res.json({
      status: stats.serviceState,
      uptime,
      lastPollTime: stats.lastPollTime,
      rowsProcessedToday: stats.rowsProcessedToday,
      successCount: stats.successCount,
      errorCount: stats.errorCount,
      failedCount: stats.failedCount,
      successRate: (stats.successCount + stats.errorCount + stats.failedCount) > 0
        ? Math.round((stats.successCount / (stats.successCount + stats.errorCount + stats.failedCount)) * 100)
        : 100,
    });
  });

  // GET /api/activity
  router.get('/api/activity', requireAuth, (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const status = (req.query.status as string) || 'all';
    const data = getActivities(page, 25, status);
    res.json(data);
  });

  // POST /api/settings
  router.post('/api/settings', requireAuth, (req: Request, res: Response) => {
    const body = req.body as Record<string, string> | undefined;
    if (!body) {
      res.status(400).json({ success: false, message: 'No body provided' });
      return;
    }

    try {
      saveSettings(body);

      // Check if the request wants JSON (fetch) or redirect (form)
      const acceptsJson = req.headers.accept?.includes('application/json') ||
        req.headers['content-type']?.includes('application/x-www-form-urlencoded');

      if (req.headers['x-requested-with'] || req.headers.accept?.includes('application/json')) {
        res.json({ success: true, message: 'Settings saved! Service will restart.' });
      } else {
        res.redirect('/settings?saved=1');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      if (req.headers.accept?.includes('application/json')) {
        res.status(500).json({ success: false, message: msg });
      } else {
        res.redirect(`/settings?error=${encodeURIComponent(msg)}`);
      }
    }
  });

  // POST /api/control
  router.post('/api/control', requireAuth, (req: Request, res: Response) => {
    const body = req.body as Record<string, string> | undefined;
    const action = body?.action;

    switch (action) {
      case 'start':
        setServiceState('running');
        break;
      case 'stop':
        setServiceState('stopped');
        break;
      case 'poll_now':
        // In a full implementation this would trigger an immediate poll
        break;
      default:
        if (req.headers.accept?.includes('application/json')) {
          res.status(400).json({ success: false, message: 'Invalid action' });
        } else {
          res.redirect('/');
        }
        return;
    }

    if (req.headers.accept?.includes('application/json')) {
      res.json({ success: true, action, message: `Action "${action}" executed` });
    } else {
      res.redirect('/');
    }
  });

  // GET /api/config
  router.get('/api/config', requireAuth, (_req: Request, res: Response) => {
    const settings = loadCurrentSettings();
    // Mask sensitive tokens
    res.json({
      sheetId: settings.sheetId,
      worksheetName: settings.worksheetName,
      bufferAccessToken: maskToken(settings.bufferAccessToken),
      bufferChannelId: settings.bufferChannelId,
      pollingInterval: settings.pollingInterval,
      googleServiceAccountJson: settings.googleServiceAccountJson ? '***configured***' : '',
      dashboardPassword: '********',
    });
  });

  return router;
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function loadCurrentSettings(): SettingsData {
  return {
    sheetId: process.env['SHEET_ID'] || '19xNwnl0k-jOqbR08NGqKziyiNV2K3_4X5Hw7nb0ULc0',
    worksheetName: process.env['WORKSHEET_NAME'] || 'TikTok',
    bufferAccessToken: process.env['BUFFER_ACCESS_TOKEN'] || 'mOfbRxXB-2IjvshBwRH2DSRXVrHWnRcS4SO2fm-X_rBc',
    bufferChannelId: process.env['BUFFER_TIKTOK_PROFILE_ID'] || '69c30c79af47dacb694faf6e',
    pollingInterval: parseInt(process.env['POLLING_INTERVAL_SECONDS'] || '60') || 60,
    googleServiceAccountJson: loadGoogleCredentials(),
    dashboardPassword: getDashboardPassword(),
  };
}

function loadGoogleCredentials(): string {
  const credPath = process.env['GOOGLE_CREDENTIALS_PATH'];
  if (credPath) {
    try {
      const resolved = resolve(credPath);
      if (existsSync(resolved)) {
        return readFileSync(resolved, 'utf-8');
      }
    } catch {
      // Return empty if can't read
    }
  }
  return '';
}

function saveSettings(body: Record<string, string>): void {
  const ecosystemPath = resolve(process.cwd(), 'ecosystem.config.cjs');

  const env: Record<string, string> = {};

  if (body.sheetId) env['SHEET_ID'] = body.sheetId;
  if (body.worksheetName) env['WORKSHEET_NAME'] = body.worksheetName;
  if (body.bufferAccessToken) env['BUFFER_ACCESS_TOKEN'] = body.bufferAccessToken;
  if (body.bufferChannelId) env['BUFFER_TIKTOK_PROFILE_ID'] = body.bufferChannelId;
  if (body.pollingInterval) env['POLLING_INTERVAL_SECONDS'] = body.pollingInterval;
  if (body.dashboardPassword) env['DASHBOARD_PASSWORD'] = body.dashboardPassword;

  // Save Google credentials to file if provided
  if (body.googleServiceAccountJson && body.googleServiceAccountJson.trim()) {
    const credsPath = resolve(process.cwd(), 'credentials.json');
    writeFileSync(credsPath, body.googleServiceAccountJson, 'utf-8');
    env['GOOGLE_CREDENTIALS_PATH'] = './credentials.json';
  }

  // Write ecosystem.config.cjs
  const ecosystemContent = `module.exports = {
  apps: [{
    name: 'sheet-to-tiktok',
    script: 'dist/index.js',
    env: ${JSON.stringify(env, null, 6)}
  }]
};
`;

  writeFileSync(ecosystemPath, ecosystemContent, 'utf-8');

  // Update current process env vars for immediate effect
  Object.entries(env).forEach(([key, value]) => {
    process.env[key] = value;
  });
}

function maskToken(token: string): string {
  if (!token || token.length < 8) return '****';
  return token.substring(0, 4) + '****' + token.substring(token.length - 4);
}

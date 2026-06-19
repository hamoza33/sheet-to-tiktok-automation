import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

/**
 * In-memory session store. Maps session tokens to creation timestamps.
 */
const sessions = new Map<string, number>();

/** Session cookie name */
const COOKIE_NAME = 'dashboard_session';

/** Session TTL: 24 hours */
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Get the dashboard password from environment or default.
 */
export function getDashboardPassword(): string {
  return process.env['DASHBOARD_PASSWORD'] || 'admin123';
}

/**
 * Parse cookies from the Cookie header manually (no cookie-parser dependency).
 */
export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(';').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx > 0) {
      const key = pair.substring(0, idx).trim();
      const value = pair.substring(idx + 1).trim();
      cookies[key] = decodeURIComponent(value);
    }
  });

  return cookies;
}

/**
 * Create a new session and return the token.
 */
export function createSession(): string {
  const token = randomUUID();
  sessions.set(token, Date.now());
  return token;
}

/**
 * Validate a session token.
 */
export function isValidSession(token: string | undefined): boolean {
  if (!token) return false;
  const created = sessions.get(token);
  if (created === undefined) return false;

  // Check TTL
  if (Date.now() - created > SESSION_TTL_MS) {
    sessions.delete(token);
    return false;
  }

  return true;
}

/**
 * Destroy a session.
 */
export function destroySession(token: string): void {
  sessions.delete(token);
}

/**
 * Express middleware that checks for a valid session cookie.
 * Redirects to /login if not authenticated.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[COOKIE_NAME];

  if (isValidSession(token)) {
    next();
  } else {
    // For API routes, return 401 JSON
    if (req.path.startsWith('/api/')) {
      res.status(401).json({ error: 'Unauthorized' });
    } else {
      res.redirect('/login');
    }
  }
}

/**
 * Set the session cookie on a response.
 */
export function setSessionCookie(res: Response, token: string): void {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Lax`);
}

/**
 * Clear the session cookie.
 */
export function clearSessionCookie(res: Response): void {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0`);
}

/**
 * Login Attempts Model
 * --------------------
 * Records all login attempts with:
 * - Username
 * - IP address
 * - Timestamp
 * - Success or failure
 *
 * Used to enforce account lockout rules.
 */


import db from "./db.js";

export function logLoginAttempt({ username, ip, success }) {
  db.prepare(`
    INSERT INTO login_attempts (username, ip, success, created_at)
    VALUES (?, ?, ?, ?)
  `).run(username ?? null, ip, success ? 1 : 0, Date.now());
}

export function countRecentFailures(username, windowMs) {
  const since = Date.now() - windowMs;
  const row = db.prepare(`
    SELECT COUNT(*) AS cnt
    FROM login_attempts
    WHERE username = ? AND success = 0 AND created_at >= ?
  `).get(username, since);
  return row?.cnt ?? 0;
}

/**
 * User Database Model
 * -------------------
 * Handles all database operations related to users:
 * - Creating users
 * - Fetching users by username/email/id
 * - Updating passwords, emails, display names
 * - Managing account lockout state
 */

import db from "./db.js";

export function createUser({ username, email, displayName, passwordHash }) {
  const now = Date.now();
  const stmt = db.prepare(`
    INSERT INTO users (username, email, display_name, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(username, email, displayName, passwordHash, now, now);
  return info.lastInsertRowid;
}

export function getUserByUsername(username) {
  return db.prepare(`SELECT * FROM users WHERE username = ?`).get(username);
}

export function getUserByEmail(email) {
  return db.prepare(`SELECT * FROM users WHERE email = ?`).get(email);
}

export function getUserById(id) {
  return db.prepare(`SELECT * FROM users WHERE id = ?`).get(id);
}

export function setLockedUntil(userId, lockedUntilMs) {
  db.prepare(`UPDATE users SET locked_until = ?, updated_at = ? WHERE id = ?`)
    .run(lockedUntilMs, Date.now(), userId);
}

export function updatePasswordHash(userId, newHash) {
  db.prepare(`UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`)
    .run(newHash, Date.now(), userId);
}

export function updateEmail(userId, email) {
  db.prepare(`UPDATE users SET email = ?, updated_at = ? WHERE id = ?`)
    .run(email, Date.now(), userId);
}

export function updateDisplayName(userId, displayName) {
  db.prepare(`UPDATE users SET display_name = ?, updated_at = ? WHERE id = ?`)
    .run(displayName, Date.now(), userId);
}

export function updateProfileCustomization(userId, { profileColor, avatar }) {
  db.prepare(`UPDATE users SET profile_color = ?, avatar = ?, updated_at = ? WHERE id = ?`)
    .run(profileColor, avatar, Date.now(), userId);
}

import db from "../db/db.js";

export function createUser({ username, passwordHash, email, displayName }) {
  const stmt = db.prepare(`
    INSERT INTO users (username, password_hash, email, display_name)
    VALUES (?, ?, ?, ?)
  `);
  return stmt.run(username, passwordHash, email, displayName);
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

export function updateUserDisplayName(userId, displayName) {
  return db.prepare(`UPDATE users SET display_name = ? WHERE id = ?`).run(displayName, userId);
}

export function updateUserEmail(userId, email) {
  return db.prepare(`UPDATE users SET email = ? WHERE id = ?`).run(email, userId);
}

export function updateUserPasswordHash(userId, passwordHash) {
  return db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(passwordHash, userId);
}

export function updateProfileCustomization(userId, { profileColor, avatarUrl, bio }) {
  return db.prepare(`
    UPDATE users
    SET profile_color = ?, avatar_url = ?, bio = ?
    WHERE id = ?
  `).run(profileColor || null, avatarUrl || null, bio || null, userId);
}

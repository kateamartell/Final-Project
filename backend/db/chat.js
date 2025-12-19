import db from "./db.js";

export function createChatMessage(userId, body) {
  const now = Date.now();
  const info = db.prepare(`
    INSERT INTO chat_messages (user_id, body, created_at)
    VALUES (?, ?, ?)
  `).run(userId, body, now);
  return info.lastInsertRowid;
}

export function getRecentChatMessages(limit = 50) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  // newest first in SQL, then reverse in JS for chronological display
  const rows = db.prepare(`
    SELECT m.id, m.body, m.created_at,
           u.display_name, u.profile_color, u.avatar
    FROM chat_messages m
    JOIN users u ON u.id = m.user_id
    ORDER BY m.created_at DESC
    LIMIT ?
  `).all(safeLimit);
  return rows.reverse();
}

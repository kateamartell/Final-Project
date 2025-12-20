/**
 * Comments Database Model
 * -----------------------
 * Handles all comment-related operations:
 * - Creating comments
 * - Pagination using LIMIT/OFFSET
 * - Editing comments (owner only)
 * - Soft deleting comments
 * - Comment reactions (upvote/downvote)
 */


import db from "./db.js";

export function createComment(userId, body) {
  const now = Date.now();
  const info = db.prepare(`
    INSERT INTO comments (user_id, body, created_at)
    VALUES (?, ?, ?)
  `).run(userId, body, now);
  return info.lastInsertRowid;
}

export function getCommentsPage({ page = 1, pageSize = 20 }) {
  const safePageSize = Math.min(Math.max(Number(pageSize) || 20, 5), 50);
  const p = Math.max(Number(page) || 1, 1);
  const offset = (p - 1) * safePageSize;

  const totalRow = db.prepare(`SELECT COUNT(*) AS total FROM comments WHERE is_deleted = 0`).get();
  const total = totalRow?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));

  const finalPage = Math.min(p, totalPages);
  const finalOffset = (finalPage - 1) * safePageSize;

  const rows = db.prepare(`
    SELECT c.id, c.body, c.created_at, c.updated_at, c.is_deleted, c.edit_count,
           u.id AS user_id, u.display_name, u.profile_color, u.avatar,
           COALESCE(SUM(cr.value), 0) AS score
    FROM comments c
    JOIN users u ON u.id = c.user_id
    LEFT JOIN comment_reactions cr ON cr.comment_id = c.id
    WHERE c.is_deleted = 0
    GROUP BY c.id
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `).all(safePageSize, finalOffset);

  return {
    comments: rows,
    page: finalPage,
    pageSize: safePageSize,
    total,
    totalPages
  };
}

export function getCommentById(commentId) {
  return db.prepare(`SELECT * FROM comments WHERE id = ?`).get(commentId);
}

export function updateComment(commentId, userId, newBody) {
  const now = Date.now();
  const info = db.prepare(`
    UPDATE comments
    SET body = ?, updated_at = ?, edit_count = edit_count + 1
    WHERE id = ? AND user_id = ? AND is_deleted = 0
  `).run(newBody, now, commentId, userId);
  return info.changes > 0;
}

export function softDeleteComment(commentId, userId) {
  const info = db.prepare(`
    UPDATE comments
    SET is_deleted = 1, updated_at = ?
    WHERE id = ? AND user_id = ? AND is_deleted = 0
  `).run(Date.now(), commentId, userId);
  return info.changes > 0;
}

export function setReaction(commentId, userId, value) {
  const v = value === -1 ? -1 : 1;
  db.prepare(`
    INSERT INTO comment_reactions (comment_id, user_id, value, created_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(comment_id, user_id) DO UPDATE SET value=excluded.value
  `).run(commentId, userId, v, Date.now());

  const row = db.prepare(`
    SELECT COALESCE(SUM(value), 0) AS score
    FROM comment_reactions
    WHERE comment_id = ?
  `).get(commentId);
  return row?.score ?? 0;
}

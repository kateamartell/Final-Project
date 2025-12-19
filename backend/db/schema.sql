PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,

  profile_color TEXT DEFAULT '#3b82f6',
  avatar TEXT DEFAULT 'default',

  locked_until INTEGER DEFAULT 0,   -- unix ms
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  sid TEXT PRIMARY KEY,
  sess TEXT NOT NULL,
  expire INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT,
  ip TEXT NOT NULL,
  success INTEGER NOT NULL,         -- 0/1
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_user_time
  ON login_attempts(username, created_at);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  edit_count INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comments_created_at
  ON comments(created_at);

CREATE INDEX IF NOT EXISTS idx_comments_user_created_at
  ON comments(user_id, created_at);

CREATE TABLE IF NOT EXISTS comment_reactions (
  comment_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  value INTEGER NOT NULL, -- +1 or -1
  created_at INTEGER NOT NULL,
  PRIMARY KEY(comment_id, user_id),
  FOREIGN KEY(comment_id) REFERENCES comments(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chat_created_at
  ON chat_messages(created_at);

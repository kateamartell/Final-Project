import express from "express";
import session from "express-session";
import SQLiteStoreFactory from "connect-sqlite3";
import helmet from "helmet";
import argon2 from "argon2";
import http from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { engine } from "express-handlebars";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { initDb } from "./db/init.js";
import { requireLogin } from "./middleware/auth.js";
import { validatePassword, validateEmail, validateDisplayName } from "./utils/passwordPolicy.js";
import { renderMarkdownSafe } from "./utils/markdown.js";
import hbsHelpers from "./views/helpers.js";

import {
  createUser,
  getUserByUsername,
  getUserByEmail,
  getUserById,
  setLockedUntil,
  updatePasswordHash,
  updateEmail,
  updateDisplayName,
  updateProfileCustomization
} from "./db/users.js";

import { logLoginAttempt, countRecentFailures } from "./db/loginAttempts.js";

import {
  createComment,
  getCommentsPage,
  updateComment,
  softDeleteComment,
  setReaction,
  getCommentById
} from "./db/comments.js";

import { createChatMessage, getRecentChatMessages } from "./db/chat.js";

initDb();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server);

app.set("trust proxy", 1);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.engine("hbs", engine({ extname: ".hbs", helpers: hbsHelpers }));
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

app.use(helmet());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const SQLiteStore = SQLiteStoreFactory(session);

const sessionMiddleware = session({
  store: new SQLiteStore({
    db: "sessions.sqlite3",
    dir: path.join(__dirname, "db"),
    table: "sessions",
    concurrentDB: true
  }),
  secret: process.env.SESSION_SECRET || "change-this-secret",
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: "auto",
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
});

app.use(sessionMiddleware);

app.use((req, res, next) => {
  if (req.session.userId) {
    res.locals.user = {
      isLoggedIn: true,
      name: req.session.displayName || req.session.username,
      id: req.session.userId
    };
  } else {
    res.locals.user = { isLoggedIn: false, name: "Guest" };
  }
  next();
});

function getClientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length > 0) return xf.split(",")[0].trim();
  return req.socket.remoteAddress || "unknown";
}

/* ---------- PAGES ---------- */

app.get("/", (req, res) => res.redirect("/comments"));

app.get("/login", (req, res) => {
  res.render("login", { error: null });
});

app.get("/register", (req, res) => {
  res.render("register", { error: null, form: {} });
});

/* ---------- AUTH ---------- */

app.post("/register", async (req, res) => {
  const username = (req.body.username || "").trim();
  const email = (req.body.email || "").trim();
  const displayName = (req.body.displayName || "").trim();
  const password = req.body.password || "";

  const form = { username, email, displayName };

  try {
    if (!username || !email || !displayName || !password) {
      return res.status(400).render("register", { error: "All fields are required.", form });
    }

    if (getUserByUsername(username)) {
      return res.status(409).render("register", { error: "Username already exists.", form });
    }

    if (getUserByEmail(email)) {
      return res.status(409).render("register", { error: "Email already exists.", form });
    }

    const emailCheck = validateEmail(email);
    if (!emailCheck.ok) {
      return res.status(400).render("register", { error: emailCheck.error, form });
    }

    const dnCheck = validateDisplayName(displayName, username);
    if (!dnCheck.ok) {
      return res.status(400).render("register", { error: dnCheck.error, form });
    }

    const pwCheck = validatePassword(password);
    if (!pwCheck.ok) {
      return res.status(400).render("register", { error: pwCheck.errors.join(" "), form });
    }

    const hash = await argon2.hash(password);
    const userId = createUser({ username, email, displayName, passwordHash: hash });

    req.session.userId = userId;
    req.session.username = username;
    req.session.displayName = displayName;

    return res.redirect("/comments");
  } catch (err) {
    console.error(err);
    return res.status(500).render("register", { error: "Registration failed.", form });
  }
});

app.post("/login", async (req, res) => {
  const username = (req.body.username || "").trim();
  const password = req.body.password || "";
  const ip = getClientIp(req);

  try {
    const user = getUserByUsername(username);

    if (!user) {
      logLoginAttempt({ username, ip, success: false });
      return res.status(401).render("login", {
        error: "Invalid username or password."
      });
    }

    // 🔒 ACCOUNT LOCK CHECK (FIRST)
    if (user.locked_until && user.locked_until > Date.now()) {
      const minutes = Math.ceil((user.locked_until - Date.now()) / 60000);
      return res.status(423).render("login", {
        error: `Account locked due to too many failed attempts. Try again in ${minutes} minute(s).`
      });
    }

    const ok = await argon2.verify(user.password_hash, password);
    logLoginAttempt({ username, ip, success: ok });

    if (!ok) {
      const failures = countRecentFailures(username, 15 * 60 * 1000);

      if (failures >= 5) {
        const lockUntil = Date.now() + 15 * 60 * 1000;
        setLockedUntil(user.id, lockUntil);

        return res.status(423).render("login", {
          error: "Too many failed login attempts. Your account has been locked for 15 minutes."
        });
      }

      return res.status(401).render("login", {
        error: "Invalid username or password."
      });
    }

    // ✅ SUCCESSFUL LOGIN
    setLockedUntil(user.id, 0);

    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.displayName = user.display_name;

    res.redirect("/comments");
  } catch (err) {
    console.error(err);
    res.status(500).render("login", {
      error: "Login failed. Please try again."
    });
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

/* ---------- COMMENTS ---------- */

app.get("/comments", (req, res) => {
  const page = Number(req.query.page || 1);
  const data = getCommentsPage({ page });

  const comments = data.comments.map((c) => ({
    ...c,
    bodyHtml: renderMarkdownSafe(c.body)
  }));

  res.render("comments", {
    comments,
    page: data.page,
    totalPages: data.totalPages
  });
});

app.post("/comments", requireLogin, (req, res) => {
  const body = (req.body.body || "").toString();
  if (!body.trim()) return res.redirect("/comments");
  if (body.length > 5000) return res.redirect("/comments");

  createComment(req.session.userId, body);
  res.redirect("/comments");
});

/* ---------- COMMENTS API ---------- */

app.put("/api/comments/:id", requireLogin, (req, res) => {
  const commentId = Number(req.params.id);
  const body = (req.body.body || "").toString();

  if (!Number.isFinite(commentId)) return res.status(400).send("Invalid id.");
  if (!body.trim()) return res.status(400).send("Empty.");
  if (body.length > 5000) return res.status(400).send("Too long.");

  const ok = updateComment(commentId, req.session.userId, body);
  if (!ok) return res.status(403).send("Forbidden.");

  res.json({ ok: true });
});

app.post("/api/comments/:id/delete", requireLogin, (req, res) => {
  const commentId = Number(req.params.id);
  if (!Number.isFinite(commentId)) return res.status(400).send("Invalid id.");

  const ok = softDeleteComment(commentId, req.session.userId);
  if (!ok) return res.status(403).send("Forbidden.");

  res.redirect("/comments");
});

app.post("/api/comments/:id/vote", requireLogin, (req, res) => {
  const commentId = Number(req.params.id);
  const value = Number(req.body.value);

  if (!Number.isFinite(commentId)) return res.status(400).send("Invalid id.");
  if (![1, -1].includes(value)) return res.status(400).send("Invalid vote.");

  const c = getCommentById(commentId);
  if (!c || c.is_deleted) return res.status(404).send("Not found.");

  const score = setReaction(commentId, req.session.userId, value);
  res.json({ ok: true, score });
});

/* ---------- PROFILE ---------- */

app.get("/profile", requireLogin, (req, res) => {
  const profile = getUserById(req.session.userId);
  res.render("profile", { profile });
});

app.post("/api/profile/display-name", requireLogin, (req, res) => {
  const displayName = (req.body.displayName || "").trim();
  const user = getUserById(req.session.userId);

  const dn = validateDisplayName(displayName, user.username);
  if (!dn.ok) return res.status(400).send(dn.error);

  updateDisplayName(user.id, displayName);
  req.session.displayName = displayName;

  res.redirect("/profile");
});

app.post("/api/profile/email", requireLogin, async (req, res) => {
  const newEmail = (req.body.email || "").trim();
  const currentPassword = req.body.currentPassword || "";

  const e = validateEmail(newEmail);
  if (!e.ok) return res.status(400).send(e.error);

  const existing = getUserByEmail(newEmail);
  if (existing && existing.id !== req.session.userId) return res.status(409).send("Email already in use.");

  const user = getUserById(req.session.userId);
  const ok = await argon2.verify(user.password_hash, currentPassword);
  if (!ok) return res.status(401).send("Current password incorrect.");

  updateEmail(user.id, newEmail);
  res.redirect("/profile");
});

app.post("/api/profile/password", requireLogin, async (req, res) => {
  const currentPassword = req.body.currentPassword || "";
  const newPassword = req.body.newPassword || "";

  const user = getUserById(req.session.userId);
  const ok = await argon2.verify(user.password_hash, currentPassword);
  if (!ok) return res.status(401).send("Current password incorrect.");

  const pw = validatePassword(newPassword);
  if (!pw.ok) return res.status(400).send(pw.errors.join(" "));

  const newHash = await argon2.hash(newPassword);
  updatePasswordHash(user.id, newHash);

  req.session.destroy(() => res.redirect("/login"));
});

app.post("/api/profile/customize", requireLogin, (req, res) => {
  const profileColor = (req.body.profileColor || "#3b82f6").trim();
  const avatar = (req.body.avatar || "default").trim();

  if (!/^#[0-9a-fA-F]{6}$/.test(profileColor)) return res.status(400).send("Invalid color.");
  if (avatar.length > 40) return res.status(400).send("Invalid avatar.");

  updateProfileCustomization(req.session.userId, { profileColor, avatar });
  res.redirect("/profile");
});

/* ---------- CHAT ---------- */

app.get("/api/chat", (req, res) => {
  res.json({ messages: getRecentChatMessages(50) });
});

io.engine.use(sessionMiddleware);

io.on("connection", (socket) => {
  const userId = socket.request.session?.userId;

  socket.on("chat:send", (payload) => {
    try {
      if (!userId) return;

      const body = (payload?.body || "").toString();
      if (!body.trim()) return;
      if (body.length > 2000) return;

      createChatMessage(userId, body);
      const user = getUserById(userId);

      io.emit("chat:new", {
        body,
        created_at: Date.now(),
        display_name: user.display_name,
        profile_color: user.profile_color,
        avatar: user.avatar
      });
    } catch (err) {
      console.error(err);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

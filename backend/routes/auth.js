import express from "express";
import argon2 from "argon2";
import db from "../db/db.js";

const router = express.Router();

/**
 * GET /register
 */
router.get("/register", (req, res) => {
  res.render("register");
});

/**
 * POST /register
 */
router.post("/register", async (req, res) => {
  const { username, password, email, displayName } = req.body;

  if (!username || !password || !email || !displayName) {
    return res.render("register", { error: "All fields are required" });
  }

  try {
    const hash = await argon2.hash(password);

    db.prepare(`
      INSERT INTO users (username, password_hash, email, display_name)
      VALUES (?, ?, ?, ?)
    `).run(username, hash, email, displayName);

    res.redirect("/login");
  } catch (err) {
    console.error(err);
    res.render("register", { error: "User already exists or invalid input" });
  }
});

/**
 * GET /login
 */
router.get("/login", (req, res) => {
  res.render("login");
});

/**
 * POST /login
 */
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username);

  if (!user) {
    return res.render("login", { error: "Invalid credentials" });
  }

  const valid = await argon2.verify(user.password_hash, password);
  if (!valid) {
    return res.render("login", { error: "Invalid credentials" });
  }

  // Save user session
  req.session.user = {
    id: user.id,
    username: user.username,
    displayName: user.display_name
  };

  res.redirect("/");
});

/**
 * POST /logout
 */
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

export default router;

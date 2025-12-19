export function requireLogin(req, res, next) {
  if (req.session?.userId) return next();
  return res.status(401).send("Login required.");
}

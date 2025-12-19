export function validatePassword(pw) {
  const errors = [];
  if (typeof pw !== "string") errors.push("Password must be a string.");
  if (!pw || pw.length < 10) errors.push("Password must be at least 10 characters.");
  if (!/[a-z]/.test(pw)) errors.push("Password must include a lowercase letter.");
  if (!/[A-Z]/.test(pw)) errors.push("Password must include an uppercase letter.");
  if (!/[0-9]/.test(pw)) errors.push("Password must include a number.");
  if (!/[^A-Za-z0-9]/.test(pw)) errors.push("Password must include a symbol.");
  return { ok: errors.length === 0, errors };
}

export function validateEmail(email) {
  if (typeof email !== "string") return { ok: false, error: "Invalid email." };
  const e = email.trim();
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return { ok: re.test(e), error: re.test(e) ? null : "Invalid email format." };
}

export function validateDisplayName(displayName, username) {
  if (typeof displayName !== "string") return { ok: false, error: "Invalid display name." };
  const dn = displayName.trim();
  if (dn.length < 3 || dn.length > 30) return { ok: false, error: "Display name must be 3–30 characters." };
  if (!/^[A-Za-z0-9 _.-]+$/.test(dn)) return { ok: false, error: "Display name contains invalid characters." };
  if (username && dn.toLowerCase() === username.trim().toLowerCase()) {
    return { ok: false, error: "Display name must be different from username." };
  }
  return { ok: true, error: null };
}

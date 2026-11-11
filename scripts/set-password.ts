/*
 * Sets or changes a user's password.
 *
 *   npm run user:password -- admin@bolfos.shop 'a-new-strong-password'
 *
 * Use this instead of deleting the account, which would lose its order
 * history. The admin account is the one created by npm run db:seed.
 */
import { one, run } from "../src/lib/db/client.ts";
import { hashPassword } from "../src/lib/auth-data.ts";

const MIN_PASSWORD = 8;

const [email, password] = process.argv.slice(2);

if (!email || !password) {
  console.error("Usage: npm run user:password -- <email> <new-password>");
  process.exit(1);
}

if (password.length < MIN_PASSWORD) {
  console.error(`Password must be at least ${MIN_PASSWORD} characters.`);
  process.exit(1);
}

const user = one<{ id: number; name: string; is_admin: number }>(
  "SELECT id, name, is_admin FROM users WHERE email = ?",
  email.toLowerCase().trim(),
);

if (!user) {
  console.error(`No account with that email: ${email}`);
  process.exit(1);
}

run("UPDATE users SET password_hash = ? WHERE id = ?", hashPassword(password), user.id);

// Every existing session for this account is invalidated, so a stolen cookie
// cannot outlive a password change.
run("DELETE FROM sessions WHERE user_id = ?", user.id);

console.log(
  `Password updated for ${email} (${user.name}${user.is_admin ? ", admin" : ""}). Existing sessions were signed out.`,
);

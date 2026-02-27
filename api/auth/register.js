const { sql } = require('@vercel/postgres');
const bcrypt = require('bcryptjs');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body ?? {};

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const trimmed = username.trim().toLowerCase();

    if (trimmed.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const { rows: existing } = await sql`
      SELECT id FROM users WHERE username = ${trimmed}
    `;

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Username already taken.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId       = crypto.randomUUID();

    await sql`
      INSERT INTO users (id, username, password_hash, created_at)
      VALUES (${userId}, ${trimmed}, ${passwordHash}, ${new Date().toISOString()})
    `;

    return res.status(201).json({ userId, username: trimmed });
  } catch (err) {
    console.error('[auth/register]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

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

    const { rows } = await sql`
      SELECT id, password_hash FROM users WHERE username = ${username.trim().toLowerCase()}
    `;

    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const valid = await bcrypt.compare(password, rows[0].password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    return res.status(200).json({ userId: rows[0].id, username: username.trim().toLowerCase() });
  } catch (err) {
    console.error('[auth/login]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

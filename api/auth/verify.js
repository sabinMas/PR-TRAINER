const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Token is required.' });
    }

    const { rows } = await sql`
      SELECT mt.user_id, mt.expires_at, mt.used, u.email
      FROM   magic_tokens mt
      JOIN   users u ON u.id = mt.user_id
      WHERE  mt.token = ${token}
    `;

    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid sign-in link.' });
    }

    const row = rows[0];

    if (row.used) {
      return res.status(401).json({ error: 'This sign-in link has already been used. Request a new one.' });
    }

    if (new Date(row.expires_at) < new Date()) {
      return res.status(401).json({ error: 'This sign-in link has expired. Request a new one.' });
    }

    // Consume the token so it cannot be reused
    await sql`UPDATE magic_tokens SET used = true WHERE token = ${token}`;

    return res.status(200).json({ userId: row.user_id, email: row.email });
  } catch (err) {
    console.error('[auth/verify]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

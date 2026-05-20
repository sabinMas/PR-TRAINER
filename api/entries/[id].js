const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  const { id } = req.query;

  if (req.method === 'PUT') return handlePut(req, res, id);
  if (req.method === 'DELETE') return handleDelete(req, res, id);
  return res.status(405).json({ error: 'Method not allowed' });
};

async function handlePut(req, res, id) {
  const body = req.body ?? {};
  const { userId, timeSec } = body;

  if (!id) return res.status(400).json({ error: 'Entry ID is required' });
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  if (timeSec == null) return res.status(400).json({ error: 'timeSec is required' });

  const timeNum = parseFloat(timeSec);
  if (isNaN(timeNum) || timeNum <= 0) {
    return res.status(400).json({ error: 'timeSec must be a positive number' });
  }

  try {
    const { rows: existing } = await sql`SELECT user_id FROM entries WHERE id = ${id}`;

    if (!existing.length) return res.status(404).json({ error: 'Entry not found' });
    if (existing[0].user_id !== userId) {
      return res.status(403).json({ error: 'You do not have permission to update this entry' });
    }

    const { rows } = await sql`
      UPDATE entries
      SET time_sec = ${timeNum}
      WHERE id = ${id}
      RETURNING id, user_id, type, bike_type, time_sec, date, location, notes, created_at
    `;

    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error('[entries PUT]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleDelete(req, res, id) {
  const { userId } = req.query;

  if (!id) return res.status(400).json({ error: 'Entry ID is required' });
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    const { rows: existing } = await sql`SELECT user_id FROM entries WHERE id = ${id}`;

    if (!existing.length) return res.status(404).json({ error: 'Entry not found' });
    if (existing[0].user_id !== userId) {
      return res.status(403).json({ error: 'You do not have permission to delete this entry' });
    }

    await sql`DELETE FROM entries WHERE id = ${id}`;
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[entries DELETE]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

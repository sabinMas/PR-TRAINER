const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  try {
    if (req.method === 'GET')  return await handleGet(req, res);
    if (req.method === 'POST') return await handlePost(req, res);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[entries]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/entries?userId=...
async function handleGet(req, res) {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const { rows } = await sql`
    SELECT id, user_id, type, time_sec, date, location, notes, created_at
    FROM   entries
    WHERE  user_id = ${userId}
    ORDER  BY created_at DESC
  `;

  return res.status(200).json(rows);
}

// POST /api/entries  { userId, type, timeSec, date, location?, notes? }
async function handlePost(req, res) {
  const body = req.body ?? {};
  const { userId, type, timeSec, date } = body;
  const location = (body.location ?? '').toString().trim();
  const notes    = (body.notes    ?? '').toString().trim();

  // Required field validation
  if (!userId || !type || timeSec == null || !date) {
    return res.status(400).json({
      error: 'Missing required fields: userId, type, timeSec, date',
    });
  }

  if (!['sprint', 'block'].includes(type)) {
    return res.status(400).json({ error: 'type must be "sprint" or "block"' });
  }

  const timeNum = parseFloat(timeSec);
  if (isNaN(timeNum) || timeNum <= 0) {
    return res.status(400).json({ error: 'timeSec must be a positive number' });
  }

  const id        = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const { rows } = await sql`
    INSERT INTO entries (id, user_id, type, time_sec, date, location, notes, created_at)
    VALUES (${id}, ${userId}, ${type}, ${timeNum}, ${date}, ${location}, ${notes}, ${createdAt})
    RETURNING id, user_id, type, time_sec, date, location, notes, created_at
  `;

  return res.status(201).json(rows[0]);
}

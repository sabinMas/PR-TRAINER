const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  try {
    if (req.method === 'GET')  return await handleGet(req, res);
    if (req.method === 'POST') return await handlePost(req, res);
    if (req.method === 'PUT')  return await handlePut(req, res);
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

// PUT /api/entries/:id  { userId, timeSec }
async function handlePut(req, res) {
  const { id } = req.query;
  const body = req.body ?? {};
  const { userId, timeSec } = body;

  if (!id) {
    return res.status(400).json({ error: 'Entry ID is required' });
  }

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  if (timeSec == null) {
    return res.status(400).json({ error: 'timeSec is required' });
  }

  const timeNum = parseFloat(timeSec);
  if (isNaN(timeNum) || timeNum <= 0) {
    return res.status(400).json({ error: 'timeSec must be a positive number' });
  }

  try {
    const { rows: existingRows } = await sql`
      SELECT user_id FROM entries WHERE id = ${id}
    `;

    if (!existingRows.length) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    if (existingRows[0].user_id !== userId) {
      return res.status(403).json({ error: 'You do not have permission to update this entry' });
    }

    const { rows } = await sql`
      UPDATE entries
      SET time_sec = ${timeNum}
      WHERE id = ${id}
      RETURNING id, user_id, type, time_sec, date, location, notes, created_at
    `;

    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error('[entries PUT]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

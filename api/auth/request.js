const { sql } = require('@vercel/postgres');
const { Resend } = require('resend');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body ?? {};

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Get or create user record
    let userId;
    const { rows: existing } = await sql`
      SELECT id FROM users WHERE email = ${normalizedEmail}
    `;

    if (existing.length > 0) {
      userId = existing[0].id;
    } else {
      userId = crypto.randomUUID();
      await sql`
        INSERT INTO users (id, email, created_at)
        VALUES (${userId}, ${normalizedEmail}, ${new Date().toISOString()})
      `;
    }

    // Create a token valid for 15 minutes
    const token     = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await sql`
      INSERT INTO magic_tokens (token, user_id, expires_at, used)
      VALUES (${token}, ${userId}, ${expiresAt}, false)
    `;

    // Build the sign-in URL from the incoming request host
    const proto    = req.headers['x-forwarded-proto'] || 'https';
    const host     = req.headers['x-forwarded-host']  || req.headers.host;
    const loginUrl = `${proto}://${host}/?token=${token}`;

    // Send email via Resend
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from   = process.env.RESEND_FROM_EMAIL || 'Sprint Tracker <onboarding@resend.dev>';

    await resend.emails.send({
      from,
      to: normalizedEmail,
      subject: 'Your Sprint Tracker sign-in link',
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:2rem 1rem">
          <h2 style="color:#8b1a2e;margin-bottom:0.5rem">Sprint Tracker</h2>
          <p style="color:#444;margin-bottom:1.5rem">
            Click the button below to sign in. This link expires in <strong>15 minutes</strong>.
          </p>
          <p style="margin:1.5rem 0">
            <a href="${loginUrl}"
               style="background:#8b1a2e;color:#ffffff;text-decoration:none;padding:0.75rem 1.75rem;border-radius:8px;font-weight:600;display:inline-block;font-size:1rem">
              Sign in to Sprint Tracker
            </a>
          </p>
          <p style="color:#888;font-size:0.85rem;margin-top:1.5rem">
            Or copy this link into your browser:<br />
            <a href="${loginUrl}" style="color:#8b1a2e;word-break:break-all">${loginUrl}</a>
          </p>
          <p style="color:#aaa;font-size:0.8rem;margin-top:1.5rem;border-top:1px solid #eee;padding-top:1rem">
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[auth/request]', err);
    return res.status(500).json({ error: 'Failed to send sign-in email. Please try again.' });
  }
};

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

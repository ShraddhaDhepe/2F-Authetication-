const pool = require('../db/pool');

/**
 * Write an entry to audit_logs. Non-blocking — errors are swallowed so
 * they never interrupt the main request flow.
 */
async function auditLog({ userId = null, event, req = null, meta = null }) {
  try {
    const ip        = req ? (req.ip || req.connection?.remoteAddress || null) : null;
    const userAgent = req ? (req.headers?.['user-agent'] || null) : null;

    await pool.query(
      `INSERT INTO audit_logs (user_id, event, ip_address, user_agent, meta)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, event, ip, userAgent, meta ? JSON.stringify(meta) : null]
    );
  } catch (err) {
    // Never crash the request because of a logging failure
    console.error('[AuditLog] Failed to write:', err.message);
  }
}

module.exports = { auditLog };

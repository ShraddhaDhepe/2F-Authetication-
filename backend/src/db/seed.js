require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./pool');

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Seeding database...');

    // Hash a known password for the demo user
    const passwordHash = await bcrypt.hash('Password123!', 12);

    // Upsert demo user (evaluator credentials)
    await client.query(`
      INSERT INTO users (id, email, password_hash, phone, is_active, is_2fa_enabled)
      VALUES (
        gen_random_uuid(),
        'demo@example.com',
        $1,
        '+14155552671',
        true,
        false
      )
      ON CONFLICT (email) DO UPDATE
        SET password_hash = EXCLUDED.password_hash,
            phone         = EXCLUDED.phone,
            updated_at    = now()
    `, [passwordHash]);

    // Upsert a second user with 2FA pre-enabled for testing
    const passwordHash2 = await bcrypt.hash('Password123!', 12);
    await client.query(`
      INSERT INTO users (id, email, password_hash, phone, is_active, is_2fa_enabled)
      VALUES (
        gen_random_uuid(),
        'twofa@example.com',
        $1,
        '+14155559999',
        true,
        true
      )
      ON CONFLICT (email) DO UPDATE
        SET password_hash  = EXCLUDED.password_hash,
            phone          = EXCLUDED.phone,
            is_2fa_enabled = EXCLUDED.is_2fa_enabled,
            updated_at     = now()
    `, [passwordHash2]);

    console.log('✅ Seed completed.');
    console.log('   demo@example.com    / Password123! (2FA disabled)');
    console.log('   twofa@example.com   / Password123! (2FA enabled)');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();

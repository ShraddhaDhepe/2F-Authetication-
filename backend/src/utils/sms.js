require('dotenv').config();

/**
 * OTP Delivery via Twilio Verify API
 * Works with Indian numbers on Twilio trial accounts.
 *
 * MOCK_SMS=true        → terminal only (development)
 * SMS_PROVIDER=twilio_verify → real SMS via Twilio Verify (production)
 */

let twilioClient = null;

function getTwilioClient() {
  if (!twilioClient) {
    twilioClient = require('twilio')(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }
  return twilioClient;
}

/**
 * Send OTP to phone number.
 * When using twilio_verify, the OTP is generated and sent by Twilio.
 * We store a placeholder in DB and verify against Twilio during verification.
 */
async function sendOTP(phone, otp, purpose) {
  const isMock   = process.env.MOCK_SMS === 'true';
  const provider = process.env.SMS_PROVIDER || 'twilio_verify';

  // ── Terminal mock ─────────────────────────────────────────────────────────
  if (isMock) {
    console.log('\n┌─────────────────────────────────────────┐');
    console.log('│              [MOCK SMS]                 │');
    console.log(`│  To      : ${phone.padEnd(29)} │`);
    console.log(`│  Purpose : ${purpose.padEnd(29)} │`);
    console.log(`│  OTP     : ${otp.padEnd(29)} │`);
    console.log('└─────────────────────────────────────────┘\n');
    return { success: true, mock: true };
  }

  // ── Twilio Verify API ─────────────────────────────────────────────────────
  if (provider === 'twilio_verify') {
    const verifySid = process.env.TWILIO_VERIFY_SID;

    if (!verifySid) {
      console.log(`⚠️  TWILIO_VERIFY_SID not set. Terminal OTP for ${phone}: ${otp}`);
      return { success: true, mock: true };
    }

    try {
      const client = getTwilioClient();
      const verification = await client.verify.v2
        .services(verifySid)
        .verifications.create({ to: phone, channel: 'sms' });

      console.log(`✅ OTP sent via Twilio Verify to ${phone} | status: ${verification.status}`);
      return { success: true, via: 'twilio_verify' };
    } catch (err) {
      console.error('❌ Twilio Verify send error:', err.message);
      // Fallback to terminal so app doesn't break
      console.log(`⚠️  Fallback terminal OTP for ${phone}: ${otp}`);
      return { success: true, mock: true };
    }
  }

  // ── Fast2SMS fallback ─────────────────────────────────────────────────────
  if (provider === 'fast2sms') {
    const apiKey = process.env.FAST2SMS_API_KEY;
    const mobile = phone.startsWith('+91') ? phone.slice(3) : phone.replace(/\D/g, '').slice(-10);

    try {
      const axios = require('axios');
      const res = await axios.post(
        'https://www.fast2sms.com/dev/bulkV2',
        { route: 'otp', variables_values: otp, numbers: mobile },
        { headers: { authorization: apiKey, 'Content-Type': 'application/json' } }
      );
      if (res.data.return === true) {
        console.log(`✅ OTP sent via Fast2SMS to ${phone}`);
        return { success: true };
      }
      throw new Error(JSON.stringify(res.data));
    } catch (err) {
      console.error('❌ Fast2SMS error:', err.message);
      console.log(`⚠️  Terminal OTP for ${phone}: ${otp}`);
      return { success: true, mock: true };
    }
  }

  // Fallback
  console.log(`⚠️  No SMS provider matched. Terminal OTP for ${phone}: ${otp}`);
  return { success: true, mock: true };
}

/**
 * Verify OTP via Twilio Verify API.
 * Called instead of local DB bcrypt check when using twilio_verify.
 */
async function verifyTwilioOTP(phone, code) {
  const provider = process.env.SMS_PROVIDER || 'twilio_verify';

  if (provider !== 'twilio_verify') return null; // use local DB verification

  const verifySid = process.env.TWILIO_VERIFY_SID;
  if (!verifySid) return null;

  try {
    const client = getTwilioClient();
    const result = await client.verify.v2
      .services(verifySid)
      .verificationChecks.create({ to: phone, code });

    console.log(`Twilio Verify check for ${phone}: ${result.status}`);
    return result.status === 'approved'; // true = valid OTP
  } catch (err) {
    console.error('❌ Twilio Verify check error:', err.message);
    return false;
  }
}

module.exports = { sendOTP, verifyTwilioOTP };

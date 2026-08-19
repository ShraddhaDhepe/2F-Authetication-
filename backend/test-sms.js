require('dotenv').config();

const sid      = process.env.TWILIO_ACCOUNT_SID;
const token    = process.env.TWILIO_AUTH_TOKEN;
const from     = process.env.TWILIO_PHONE_NUMBER;
const provider = process.env.SMS_PROVIDER || 'whatsapp';
const TO       = '+918208591006';

console.log('Config:', { sid: sid?.slice(0,10)+'...', from, provider, to: TO });

const twilio = require('twilio')(sid, token);

const fromAddr = provider === 'whatsapp' ? `whatsapp:${from}` : from;
const toAddr   = provider === 'whatsapp' ? `whatsapp:${TO}`   : TO;

twilio.messages.create({
  body: 'Your SecureAuth OTP is: 123456. Valid for 5 minutes.',
  from: fromAddr,
  to:   toAddr,
  contentSid: process.env.TWILIO_CONTENT_SID || undefined,
}).then(msg => {
  console.log('✅ SUCCESS — OTP sent!');
  console.log('   SID:', msg.sid, '| Status:', msg.status);
  if (provider === 'whatsapp') {
    console.log('   Check WhatsApp on +918208591006');
  }
}).catch(err => {
  console.log('❌ FAILED — Code:', err.code, '| Error:', err.message);
  if (err.code === 63007)
    console.log('FIX: Join WhatsApp Sandbox first — send "join <word>" to +14155238886 on WhatsApp');
  if (err.code === 21608)
    console.log('FIX: Verify your number at console.twilio.com → Verified Caller IDs');
});

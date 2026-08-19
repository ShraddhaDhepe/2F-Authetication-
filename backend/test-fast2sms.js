require('dotenv').config();
const axios = require('axios');

const apiKey = process.env.FAST2SMS_API_KEY;
const mobile = '8208591006'; // 10 digit without +91

console.log('Fast2SMS test');
console.log('API Key:', apiKey ? apiKey.slice(0,8)+'...' : 'MISSING');
console.log('Mobile :', mobile);
console.log('');

if (!apiKey || apiKey === 'your_fast2sms_api_key_here') {
  console.log('ERROR: FAST2SMS_API_KEY not set in .env');
  process.exit(1);
}

axios.post(
  'https://www.fast2sms.com/dev/bulkV2',
  {
    route: 'otp',
    variables_values: '123456',
    numbers: mobile,
  },
  {
    headers: {
      authorization: apiKey,
      'Content-Type': 'application/json',
    },
  }
).then(res => {
  console.log('Response:', JSON.stringify(res.data, null, 2));
  if (res.data.return === true) {
    console.log('SUCCESS — Check your phone for OTP!');
  } else {
    console.log('FAILED —', res.data.message || res.data);
  }
}).catch(err => {
  console.log('ERROR:', err.response?.data || err.message);
});

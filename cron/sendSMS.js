const coolsms = require('coolsms-node-sdk').default;
require('dotenv').config();

const messageService = new coolsms(
  process.env.SOLAPI_API_KEY,
  process.env.SOLAPI_API_SECRET
);

async function sendScheduledSMS({ to, message }) {
  try {
    await messageService.sendOne({
      to,
      from: process.env.SENDER_PHONE,
      text: message,
    });

    console.log(`✅ [자동] 문자 전송 완료: ${to}`);
  } catch (error) {
    console.error('❌ [자동] 문자 전송 실패:', error);
  }
}

module.exports = sendScheduledSMS;

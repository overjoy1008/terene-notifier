const express = require('express');
const coolsms = require('coolsms-node-sdk').default;
const router = express.Router();

const messageService = new coolsms(
  process.env.SOLAPI_API_KEY,
  process.env.SOLAPI_API_SECRET
);

router.post('/', async (req, res) => {
  const { receiver_phone, phone_message } = req.body;

  if (!receiver_phone || !phone_message) {
    return res.status(400).json({ error: 'receiver_phone과 phone_message는 필수입니다.' });
  }

  try {
    await messageService.sendOne({
      to: receiver_phone,
      from: process.env.SENDER_PHONE,
      text: phone_message,
    });

    console.log(`✅ 문자 전송 완료: ${receiver_phone}`);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ 문자 전송 실패:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

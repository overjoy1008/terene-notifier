const express = require('express');
const coolsms = require('coolsms-node-sdk').default;
const router = express.Router();

const messageService = new coolsms(
  process.env.SOLAPI_API_KEY,
  process.env.SOLAPI_API_SECRET
);

const templates = require('../templates')

router.post('/', async (req, res) => {
  const { receiver_phone, template_type, params, lang } = req.body;

  if (!receiver_phone || !template_type || !params) {
    return res.status(400).json({ error: 'receiver_phone, template_type, params는 필수입니다.' });
  }

  const language = lang === 'paypal_en'
    ? 'paypal_en'
    : lang === 'paypal_ko'
      ? 'paypal_ko'
      : 'toss_ko'
  const templateSet = templates[language]
  const template = templateSet?.[template_type]
  
  if (!template || typeof template.body !== 'function') {
    return res.status(400).json({ error: '유효하지 않은 template_type입니다.' });
  }

  const phone_message = template.body(params);

  try {
    await messageService.sendOne({
      to: receiver_phone,
      from: process.env.SENDER_PHONE,
      text: phone_message,
    });

    console.log(`✅ [v2] 문자 전송 완료: ${receiver_phone}`);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ [v2] 문자 전송 실패:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

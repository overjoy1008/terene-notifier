const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

const templates = require('../templates/messageTemplates');

router.post('/', async (req, res) => {
  const { receiver_email, template_type, params, platform } = req.body;

  if (!receiver_email || !template_type || !params || !platform) {
    return res.status(400).json({
      error: 'receiver_email, template_type, params, platform은 필수입니다.',
    });
  }

  const template = templates[template_type];
  if (!template) {
    return res.status(400).json({ error: '유효하지 않은 template_type입니다.' });
  }

  const email_subject = template.title(params);
  const email_body = template.body(params);

  let transporter;

  try {
    if (platform === 'gmail') {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SENDER_EMAIL_USER,
          pass: process.env.SENDER_EMAIL_PASS,
        },
      });
    } else if (platform === 'custom') {
      transporter = nodemailer.createTransport({
        host: 'smtp.dooray.com',
        port: 465,
        secure: true,
        auth: {
          user: process.env.SENDER_EMAIL_USER,
          pass: process.env.SENDER_EMAIL_PASS,
        },
      });
    } else {
      return res.status(400).json({ error: '지원하지 않는 platform입니다.' });
    }

    await transporter.sendMail({
      from: `"TERENE" <${process.env.SENDER_EMAIL_USER}>`,
      to: receiver_email,
      subject: email_subject,
      text: email_body,
    });

    console.log(`✅ [v2] 이메일 전송 완료: ${receiver_email}`);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ [v2] 이메일 전송 실패:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

// SMTP 설정
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SENDER_EMAIL_USER,
    pass: process.env.SENDER_EMAIL_PASS,
  },
});

router.post('/', async (req, res) => {
  const { receiver_email, email_message, email_title } = req.body;

  if (!receiver_email || !email_message) {
    return res.status(400).json({ error: 'receiver_email과 email_message는 필수입니다.' });
  }

  try {
    await transporter.sendMail({
      from: `"TERENE" <${process.env.SENDER_EMAIL_USER}>`,
      to: receiver_email,
      subject: email_title || '[TERENE] 알림 메일',
      text: email_message,
    });

    console.log(`✅ 이메일 전송 완료: ${receiver_email}`);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ 이메일 전송 실패:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

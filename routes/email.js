const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

router.post('/', async (req, res) => {
  const { receiver_email, email_message, email_title, platform } = req.body;

  if (!receiver_email || !email_message || !platform) {
    return res.status(400).json({
      error: 'receiver_email, email_message, platform은 필수입니다.',
    });
  }

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
        host: 'smtp.ethereal.email',
        port: 465,
        secure: true,
        auth: {
          user: process.env.CUSTOM_EMAIL_USER,
          pass: process.env.CUSTOM_EMAIL_PASS,
        },
      });
    } else {
      return res.status(400).json({ error: '지원하지 않는 platform입니다.' });
    }

    await transporter.sendMail({
      from: `"TERENE" <${platform === 'gmail' ? process.env.SENDER_EMAIL_USER : process.env.CUSTOM_EMAIL_USER}>`,
      to: receiver_email,
      subject: email_title,
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

const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

router.post('/', async (req, res) => {
  const {
    receiver_email,
    email_message,    // text version (optional fallback)
    email_html,       // html version (optional)
    email_title,
    platform,
  } = req.body;

  if (!receiver_email || !email_title || !platform) {
    return res.status(400).json({
      error: 'receiver_email, email_title, platform은 필수입니다.',
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
        host: 'smtp.dooray.com',
        port: 465,
        secure: true,
        auth: {
          user: process.env.SENDER_EMAIL_USER,
          pass: process.env.SENDER_EMAIL_PASS,
        },
        // authMethod: 'LOGIN',
      });
    } else {
      return res.status(400).json({ error: '지원하지 않는 platform입니다.' });
    }

    // Compose mail options
    const mailOptions = {
      from: `"TERENE" <${process.env.SENDER_EMAIL_USER}>`,
      to: receiver_email,
      subject: email_title,
    };

    if (email_html) {
      mailOptions.html = email_html;
      if (email_message) {
        mailOptions.text = email_message; // optional fallback
      }
    } else if (email_message) {
      mailOptions.text = email_message;
    } else {
      return res.status(400).json({ error: 'email_message 또는 email_html 중 하나는 필요합니다.' });
    }

    await transporter.sendMail(mailOptions);

    console.log(`✅ 이메일 전송 완료: ${receiver_email}`);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ 이메일 전송 실패:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();
const path = require("path")

const templates = require('../templates')

const DEFAULT_PDF_PATH = path.join(
    __dirname,
    "../templates/terene_unmu_policies.pdf"
)
const DEFAULT_PDF_NAME = "terene_unmu_policies.pdf"

router.post('/', async (req, res) => {
  const { receiver_email, template_type, params, platform, lang, pdfPath, pdfName } = req.body;

  if (!receiver_email || !template_type || !params || !platform) {
    return res.status(400).json({
      error: 'receiver_email, template_type, params, platform은 필수입니다.',
    });
  }

  const language = lang === 'foreign_en'
    ? 'foreign_en'
    : 'toss_ko'
  const templateSet = templates[language]
  const template = templateSet?.[template_type]

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

      ...(language === 'foreign_en'
        ? {
            attachments: [
              {
                filename: pdfName
                  ? pdfName
                  : DEFAULT_PDF_NAME,
                path: pdfPath
                  ? pdfPath
                  : DEFAULT_PDF_PATH,
                contentType: 'application/pdf',
              },
            ],
          }
        : {}),
    });

    console.log(`✅ [v2] 이메일 전송 완료: ${receiver_email}`);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ [v2] 이메일 전송 실패:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

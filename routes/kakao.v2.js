const express = require('express');
const { SolapiMessageService } = require('solapi'); // ✅ 수정: 객체에서 msg만 꺼냄
const router = express.Router();
const mapKakaoTemplate = require('../utils/kakaoTemplateMapper');

const messageService = new SolapiMessageService(
  'SOLAPI_API_KEY',
  'SOLAPI_API_SECRET',
);

router.post('/', async (req, res) => {
  const { receiver_phone, template_type, params } = req.body;

  if (!receiver_phone || !template_type || !params) {
    return res.status(400).json({
      error: 'receiver_phone, template_type, params는 필수입니다.',
    });
  }

  const mapped = mapKakaoTemplate(template_type, params);

  if (!mapped) {
    return res.status(400).json({ error: '유효하지 않은 template_type입니다.' });
  }

  try {
    await messageService.sendOne(
      {
        to: receiver_phone,
        from: process.env.SENDER_PHONE,
        text: '카카오 알림톡입니다.', // 템플릿용 더미
        kakaoOptions: {
          // pfId: process.env.KAKAO_PF_ID,
          pfId: 'KA01PF250714152254890kNpf8SV8Etz',
          templateId: mapped.templateId,
          variables: mapped.variables,
        },
      }
    );

    console.log(`✅ 알림톡 전송 완료: ${receiver_phone}`);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ 알림톡 전송 실패:');
    console.error('🔸 message:', error.message);
    if (error.response) {
      console.error('🔸 status:', error.response.status);
      console.error('🔸 data:', error.response.data);
    }
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }
});

module.exports = router;

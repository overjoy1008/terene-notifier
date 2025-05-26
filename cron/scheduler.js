const cron = require('node-cron');
const axios = require('axios'); // fetch 대신 axios 사용
const sendScheduledEmail = require('./sendEmail');
const sendScheduledSMS = require('./sendSMS');

function startScheduledJobs() {
  cron.schedule('35 * * * *', async () => {
    console.log('⏰ 매시간 35분 자동 발송 시작');

    try {
      // API에서 주문 데이터 가져오기
      const response = await axios.get('https://terene-db-server.onrender.com/api/orders');
      const orders = response.data;

      // 문자열화
      const orderString = JSON.stringify(orders, null, 2);

      // 이메일 전송
      await sendScheduledEmail({
        to: 'overjoy1008@google.com',
        subject: '자동 메일',
        message: `주문 목록:\n\n${orderString}`,
        platform: 'gmail',  // 관리자 이메일, 즉 from 주소
      });

      // 문자 전송
      await sendScheduledSMS({
        to: '01023705710',
        message: '[자동 문자] 오늘도 힘내세요! 💪',
      });

    } catch (error) {
      console.error('❌ 자동 작업 중 에러 발생:', error.message);
    }
  });
}

module.exports = startScheduledJobs;
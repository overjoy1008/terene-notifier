const cron = require('node-cron');
const axios = require('axios'); // fetch 대신 axios 사용
const sendScheduledEmail = require('./sendEmail');
const sendScheduledSMS = require('./sendSMS');

function startScheduledJobs() {
  cron.schedule('0,15,30,45 17 * * *', async () => {

    try {
    // API에서 주문 데이터 가져오기
    const response = await axios.get('https://terene-db-server.onrender.com/api/orders');
    const orders = response.data;

    // ✅ accepted 주문만 필터링
    const acceptedOrders = orders.filter(order => order.payment_status === 'accepted');

    const now = new Date();
    const kst = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // KST = UTC + 9
    const kstString = kst.toISOString().replace('T', ' ').substring(0, 19);

    // 문자열화
    const orderString = JSON.stringify(acceptedOrders, null, 2);

    // 이메일 전송
    await sendScheduledEmail({
        to: 'overjoy1008@gmail.com',
        subject: '자동 메일',
        message: `📅 현재 KST 시각: ${kstString}\n\n${orderString}`,
        platform: 'gmail',  // 관리자 이메일, 즉 from 주소
    });

      // 문자 전송
    //   await sendScheduledSMS({
    //     to: '01023705710',
    //     message: '[자동 문자]\n📅 현재 KST 시각: ${kstString}\n\n${orderString}',
    //   });

    } catch (error) {
      console.error('❌ 자동 작업 중 에러 발생:', error.message);
    }
  });
}

module.exports = startScheduledJobs;
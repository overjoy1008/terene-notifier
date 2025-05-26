const cron = require('node-cron');
const axios = require('axios'); // fetch 대신 axios 사용
const sendScheduledEmail = require('./sendEmail');
const sendScheduledSMS = require('./sendSMS');
require('dotenv').config();

function startScheduledJobs() {
  cron.schedule('0,30 * * * *', async () => {

    try {
        if (  // 개발자용 테스트 환경 render 서버에서 실제 고객에게 연락을 보내지 않도록 Ban하기
            process.env.SENDER_EMAIL_USER === 'overjoy1008@gmail.com' ||
            process.env.SENDER_PHONE === '01023705710'
        ) {
            return;
        }

        // API에서 주문 데이터 가져오기
        const response = await axios.get('https://terene-db-server.onrender.com/api/orders');
        const orders = response.data;

        // ✅ accepted 주문만 필터링
        const acceptedOrders = orders.filter(order => order.payment_status === 'accepted');

        const now = new Date();
        const kst = new Date(now.getTime() + (9 * 60 * 60 * 1000));  // KST = UTC + 9
        const kstHours = kst.getHours();
        const kstMinutes = kst.getMinutes();
        const kstString = kst.toISOString().replace('T', ' ').substring(0, 19);

        const isAround = (hour, minute, targetHour, targetMinute, margin = 5) => {  // 5분의 오차 범위 허용
            const total = hour * 60 + minute;
            const target = targetHour * 60 + targetMinute;
            return Math.abs(total - target) <= margin;
        };

        // const is3PM = isAround(kstHours, kstMinutes, 15, 0);
        // const is230PM = isAround(kstHours, kstMinutes, 14, 30);
        // const is1030AM = isAround(kstHours, kstMinutes, 10, 30);

        const generateDayBeforeCheckinMessage = (order) => {
            return `[TERENE UNMU]
내일, TERENE UNMU에 머무르게 됩니다.

테레네 운무 위치 : 강원도 화천군 하남면 호수길 206-31 (원천리 136-40, 41)
오시는 길 안내 : (LOCATION 링크)

체크인 시간 : 오후 3시
체크아웃 시간 : 오전 11시

*별채 라운지 이용시간
 : 체크인 3시간 전부터 체크아웃 30분 전까지

TERENE의 공간에서 즐거운 추억을 만들 수 있도록
최선을 다해 준비하고 있겠습니다. 감사합니다`;
        };

        const generate30mBeforeCheckinMessage = (order) => {
            // 출입문 비밀번호: 연락처 하이픈 제거 후 마지막 4자리
            const cleanPhone = order.reserver_contact.replace(/-/g, '');
            const doorCode = cleanPhone.slice(-4); // 마지막 4자리

            return `[TERENE UNMU]
${order.reserver_name}님을 맞이할 준비를 거의 다 마쳤습니다.
30분 뒤, 담당 직원의 안내를 받아 입장을 부탁 드립니다

이용방법 안내
 1. 출입문 비밀번호 : ${doorCode}
 2. WIFI 연결 : 라운지 (), 2층 (), 1층 ()

기타사항은 거실 벽 선반에 시설이용안내를 참고해주세요
불편 및 문의 사항은 카카오톡 채널(ID:TERENE)을 통해 부탁드립니다
(오전 9시~오후 9시까지)

TERENE에서 소중한 사람들과 즐거운 시간 보내시기를 바랍니다 !`;
        };

        const generate30mBeforeCheckoutMessage = (order) => {
            return `[TERENE UNMU]
아쉽지만 체크아웃 30분 전 안내를 드립니다

TERENE UNMU를 방문해주셔서 진심으로 감사드립니다
이곳에서의 시간이 머문 모두에게 소중한 추억이 되었기를 바랍니다

혹시나 불편하거나 아쉬운 점이 있으셨다면 꼭 알려주시고,
TERENE의 공간에서 ${order.reserver_name}님을 다시 만날 날을 기다리고 있겠습니다

감사합니다`;
        }

        for (const order of acceptedOrders) {
            const checkinDate = new Date(order.start_date);
            const checkoutDate = new Date(order.end_date);
            const today = new Date(kst.getFullYear(), kst.getMonth(), kst.getDate());
            const dayBeforeCheckin = new Date(checkinDate);
            dayBeforeCheckin.setDate(dayBeforeCheckin.getDate() - 1);
            const isSameDate = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

            const shouldSendDayBeforeCheckin = isAround(kstHours, kstMinutes, 15, 0) && isSameDate(today, dayBeforeCheckin);
            const shouldSend30mBeforeCheckin = isAround(kstHours, kstMinutes, 14, 30) && isSameDate(today, checkinDate);
            const shouldSend30mBeforeCheckout = isAround(kstHours, kstMinutes, 10, 30) && isSameDate(today, checkoutDate);

            if (shouldSendDayBeforeCheckin) {
                const msg = generateDayBeforeCheckinMessage(order);
                await sendScheduledEmail({
                    to: order.reserver_email,
                    subject: '[TERENE UNMU] 체크인 하루 전 안내',
                    message: msg,
                    platform: 'gmail',
                });
                await sendScheduledSMS({
                    to: order.reserver_contact.replace(/-/g, ''),
                    message: msg,
                });

                // 개발자에게도 동일한 메시지 전송
                await sendScheduledEmail({
                    to: 'overjoy1008@gmail.com',
                    subject: '[TERENE UNMU] ${order.order_id} ${order.reserver_name} 체크인 하루 전 안내',
                    message: msg,
                    platform: 'gmail',
                });
                await sendScheduledSMS({
                    to: '01023705710',
                    message: msg,
                });
            }

            if (shouldSend30mBeforeCheckin) {
                const msg = generate30mBeforeCheckinMessage(order);
                await sendScheduledEmail({
                    to: order.reserver_email,
                    subject: '[TERENE UNMU] 체크인 30분 전 안내',
                    message: msg,
                    platform: 'gmail',
                });
                await sendScheduledSMS({
                    to: order.reserver_contact.replace(/-/g, ''),
                    message: msg,
                });

                // 개발자에게도 동일한 메시지 전송
                await sendScheduledEmail({
                    to: 'overjoy1008@gmail.com',
                    subject: '[TERENE UNMU] ${order.order_id} ${order.reserver_name} 체크인 30분 전 안내',
                    message: msg,
                    platform: 'gmail',
                });
                await sendScheduledSMS({
                    to: '01023705710',
                    message: msg,
                });
            }

            if (shouldSend30mBeforeCheckout) {
                const msg = generate30mBeforeCheckoutMessage(order);
                await sendScheduledEmail({
                    to: order.reserver_email,
                    subject: '[TERENE UNMU] 체크아웃 30분 전 안내',
                    message: msg,
                    platform: 'gmail',
                });
                await sendScheduledSMS({
                    to: order.reserver_contact.replace(/-/g, ''),
                    message: msg,
                });

                // 개발자에게도 동일한 메시지 전송
                await sendScheduledEmail({
                    to: 'overjoy1008@gmail.com',
                    subject: '[TERENE UNMU] ${order.order_id} ${order.reserver_name} 체크아웃 30분 전 안내',
                    message: msg,
                    platform: 'gmail',
                });
                await sendScheduledSMS({
                    to: '01023705710',
                    message: msg,
                });
            }
        }

        console.log(`📧 총 ${acceptedOrders.length}건의 안내 메시지를 전송했습니다 (KST 기준: ${kstString})`);

    } catch (error) {
      console.error('❌ 자동 작업 중 에러 발생:', error.message);
    }
  });
}

module.exports = startScheduledJobs;
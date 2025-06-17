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

        const message_G_customer = (order) => {
            return `[TERENE ${order.order_product}]
안녕하세요, 내일 오시는 길과 체크인 시간 안내 드립니다.

테레네 운무 위치  : 강원도 화천군 하남면 호수길 206-31 (원천리 136-40, 41)
네비게이션에 ‘테레네 운무’ 또는 ‘TERENE ${order.order_product}’ 검색하셔서 오시면 됩니다.

최근 주변 도로 공사가 많으니 안전 운전하시고, 
‘지촌삼거리’에서는 ‘화천’ 방향(파란색 유도선)으로, 도착 3분 전 갈림길에서는 ‘호수길’ 방향으로 오시면 헤매지 않고 도착하실 수 있습니다.
체크인 시간 : 오후 3시
체크아웃 시간 : 오전 11시

*별채 라운지 이용시간
 : 체크인 3시간 전부터 체크아웃 30분 전까지

TERENE의 공간에서 즐거운 추억을 만들 수 있도록
최선을 다해 준비하고 있겠습니다. 
감사합니다`;
        };

        const message_G_admin = (order) => {
            return `[TERENE ${order.order_product}]
${order.reserver_name}님이 내일, TERENE ${order.order_product}에 머무르게 됩니다.

예약정보

1. 예약번호 : ${order.order_id}
2. 회원번호 : ${order.membership_number || "비회원 예약"}
3. 이름 : ${order.reserver_name}
4. 연락처 : ${order.reserver_contact}
5. 지점 : TERENE ${order.order_product}
6. 숙박 일정 : ${order.start_date}~${order.end_date}
7. 숙박 인원 : 성인 ${order.adult}명, 아동/유아 ${order.child}명
8. 결제 금액 : ${Number(order.final_price).toLocaleString()}원

* 자세한 정보는 관리자 페이지( https://terene.kr/admin-table )에서 확인해주시기 바랍니다.`;
        };

        const message_H_customer = (order) => {
            // 출입문 비밀번호: 연락처 하이픈 제거 후 마지막 4자리
            const cleanPhone = order.reserver_contact.replace(/-/g, '');
            const doorCode = cleanPhone.slice(-4); // 마지막 4자리

            return `[TERENE ${order.order_product}]
${order.reserver_name}님을 맞이할 준비를 거의 다 마쳤습니다.
3시간 뒤, 담당 직원의 안내를 받아 입장을 부탁 드립니다.
라운지는 지금부터 이용이 가능합니다.

이용방법 안내
1. 출입문 비밀번호 : ${doorCode}
2. WIFI 연결 : 
  본채 - TERENE 1F/2F 
  별채 라운지 - 배치된 QR코드로 연결

기타사항은 거실 벽 선반에 시설이용안내를 참고해주세요.
불편 및 문의 사항은 카카오톡 채널 문의를 통해 부탁드립니다.

TERENE에서 소중한 사람들과 즐거운 시간 보내시기를 바랍니다!`;
        };

        const message_H_admin = (order) => {
            return `[TERENE ${order.order_product}]
${order.reserver_name}님이 3시간 뒤, 입실 예정입니다.
청소/세팅을 마친 라운지 문은 열어두시기 바랍니다.

예약정보

1. 예약번호 : ${order.order_id}
2. 회원번호 : ${order.membership_number || "비회원 예약"}
3. 이름 : ${order.reserver_name}
4. 연락처 : ${order.reserver_contact}
5. 지점 : TERENE ${order.order_product}
6. 숙박 일정 : ${order.start_date}~${order.end_date}
7. 숙박 인원 : 성인 ${order.adult}명, 아동/유아 ${order.child}명
8. 결제 금액 : ${Number(order.final_price).toLocaleString()}원

* 자세한 정보는 관리자 페이지( https://terene.kr/admin-table )에서 확인해주시기 바랍니다.`;
        };

        const message_I_customer = (order) => {
            return `[TERENE ${order.order_product}]
아쉽지만 체크아웃 30분 전 안내를 드립니다.
지금부터 라운지는 청소를 위해 이용이 제한됩니다.

TERENE ${order.order_product}를 방문해주셔서 진심으로 감사드립니다.
이곳에서의 시간이 머문 모두에게 소중한 추억이 되었기를 바랍니다.

혹시나 불편하거나 아쉬운 점이 있으셨다면 꼭 알려주시고,
TERENE의 공간에서 ${order.reserver_name}님을 다시 만날 날을 기다리고 있겠습니다.

감사합니다`;
        };

        const message_I_admin = (order) => {
            return `[TERENE ${order.order_product}]
${order.reserver_name}님이 30분 뒤, 퇴실 예정입니다.

예약정보

1. 예약번호 : ${order.order_id}
2. 회원번호 : ${order.membership_number || "비회원 예약"}
3. 이름 : ${order.reserver_name}
4. 연락처 : ${order.reserver_contact}
5. 지점 : TERENE ${order.order_product}
6. 숙박 일정 : ${order.start_date}~${order.end_date}
7. 숙박 인원 : 성인 ${order.adult}명, 아동/유아 ${order.child}명
8. 결제 금액 : ${Number(order.final_price).toLocaleString()}원

* 자세한 정보는 관리자 페이지( https://terene.kr/admin-table )에서 확인해주시기 바랍니다.`;
        };

        for (const order of acceptedOrders) {
            const checkinDate = new Date(order.start_date);
            const checkoutDate = new Date(order.end_date);
            const today = new Date(kst.getFullYear(), kst.getMonth(), kst.getDate());
            const dayBeforeCheckin = new Date(checkinDate);
            dayBeforeCheckin.setDate(dayBeforeCheckin.getDate() - 1);
            const isSameDate = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

            const shouldSendDayBeforeCheckin = isAround(kstHours, kstMinutes, 15, 0) && isSameDate(today, dayBeforeCheckin);
            const shouldSend3hBeforeCheckin = isAround(kstHours, kstMinutes, 12, 0) && isSameDate(today, checkinDate);
            const shouldSend30mBeforeCheckout = isAround(kstHours, kstMinutes, 10, 30) && isSameDate(today, checkoutDate);
            if (!shouldSendDayBeforeCheckin && !shouldSend3hBeforeCheckin && !shouldSend30mBeforeCheckout) {
                continue;
            }

            if (shouldSendDayBeforeCheckin) {
                const customer_msg = message_G_customer(order);
                const admin_msg = message_G_admin(order);
                await sendScheduledEmail({
                    to: order.reserver_email,
                    subject: `[TERENE ${order.order_product}] 체크인 하루 전 안내`,
                    message: customer_msg,
                    platform: 'gmail',
                });
                await sendScheduledSMS({
                    to: order.reserver_contact.replace(/-/g, ''),
                    message: customer_msg,
                });

                // 관리자, 개발자에게도 동일한 메시지 전송
                await sendScheduledEmail({
                    to: 'reserve@terene.kr',
                    subject: `[TERENE ${order.order_product}] ${order.order_id || "비회원"} ${order.reserver_name}님 입실 하루 전 안내`,
                    message: admin_msg,
                    platform: 'gmail',
                });
                await sendScheduledSMS({
                    to: '01024497802',
                    message: admin_msg,
                });
                await sendScheduledEmail({
                    to: 'overjoy1008@gmail.com',
                    subject: `[TERENE ${order.order_product}] ${order.order_id || "비회원"} ${order.reserver_name}님 입실 하루 전 안내`,
                    message: admin_msg,
                    platform: 'gmail',
                });
                await sendScheduledSMS({
                    to: '01023705710',
                    message: admin_msg,
                });
            }

            if (shouldSend3hBeforeCheckin) {
                const customer_msg = message_H_customer(order);
                const admin_msg = message_H_admin(order);
                await sendScheduledEmail({
                    to: order.reserver_email,
                    subject: `[TERENE ${order.order_product}] 체크인 3시간 전 안내`,
                    message: customer_msg,
                    platform: 'gmail',
                });
                await sendScheduledSMS({
                    to: order.reserver_contact.replace(/-/g, ''),
                    message: customer_msg,
                });

                // 관리자, 개발자에게도도 동일한 메시지 전송
                await sendScheduledEmail({
                    to: 'reserve@terene.kr',
                    subject: `[TERENE ${order.order_product}] ${order.order_id || "비회원"} ${order.reserver_name}님 입실 3시간 전 안내`,
                    message: admin_msg,
                    platform: 'gmail',
                });
                await sendScheduledSMS({
                    to: '01024497802',
                    message: admin_msg,
                });
                await sendScheduledEmail({
                    to: 'overjoy1008@gmail.com',
                    subject: `[TERENE ${order.order_product}] ${order.order_id || "비회원"} ${order.reserver_name}님 입실 3시간 전 안내`,
                    message: admin_msg,
                    platform: 'gmail',
                });
                await sendScheduledSMS({
                    to: '01023705710',
                    message: admin_msg,
                });
            }

            if (shouldSend30mBeforeCheckout) {
                const customer_msg = message_I_customer(order);
                const admin_msg = message_I_admin(order);
                await sendScheduledEmail({
                    to: order.reserver_email,
                    subject: `[TERENE ${order.order_product}] 체크아웃 30분 전 안내`,
                    message: customer_msg,
                    platform: 'gmail',
                });
                await sendScheduledSMS({
                    to: order.reserver_contact.replace(/-/g, ''),
                    message: customer_msg,
                });

                // 개발자에게도 동일한 메시지 전송
                await sendScheduledEmail({
                    to: 'reserve@terene.kr',
                    subject: `[TERENE ${order.order_product}] ${order.order_id || "비회원"} ${order.reserver_name}님 퇴실 30분 전 안내`,
                    message: admin_msg,
                    platform: 'gmail',
                });
                await sendScheduledSMS({
                    to: '01024497802',
                    message: admin_msg,
                });
                await sendScheduledEmail({
                    to: 'overjoy1008@gmail.com',
                    subject: `[TERENE ${order.order_product}] ${order.order_id || "비회원"} ${order.reserver_name}님 퇴실 30분 전 안내`,
                    message: admin_msg,
                    platform: 'gmail',
                });
                await sendScheduledSMS({
                    to: '01023705710',
                    message: admin_msg,
                });
            }
        }

    } catch (error) {
      console.error('❌ 자동 작업 중 에러 발생:', error.message);
    }
  });
}

module.exports = startScheduledJobs;
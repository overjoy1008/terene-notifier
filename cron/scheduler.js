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
        // const kstString = kst.toISOString().replace('T', ' ').substring(0, 19);

        const isAround = (hour, minute, targetHour, targetMinute, margin = 5) => {  // 5분의 오차 범위 허용
            const total = hour * 60 + minute;
            const target = targetHour * 60 + targetMinute;
            return Math.abs(total - target) <= margin;
        };

        const message_G_customer = (order) => {
            return `[TERENE ${order.order_product}]
안녕하세요, ${order.reserver_name}님
오시는 길과 체크인 시간 안내 드립니다.

테레네 운무 위치 :
강원도 화천군 하남면 호수길 206-31 (원천리 136-40)

네비게이션에 ‘테레네 운무’ 또는 ‘TERENE ${order.order_product}’ 검색하셔서 오시면 됩니다.

최근 주변 도로 공사가 많으니 안전 운전하시고, 
‘지촌삼거리’에서는 ‘화천’ 방향(파란색 유도선)으로, 도착 3분 전 갈림길에서는 ‘호수길’ 방향으로 오시면 헤매지 않고 도착하실 수 있습니다.

체크인 시간 : 오후 3시
체크아웃 시간 : 오전 10시 30분

출입 비밀번호를 포함한 체크인 정보는 12시에 문자로 전달됩니다. 감사합니다!`;
        };

        const message_G_admin = (order) => {
            return `[TERENE ${order.order_product}]
${order.reserver_name}님이 체크인하는 날입니다

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
${order.reserver_name}님, 체크인 정보를 전달드립니다.

■ 출입문/라운지 비밀번호 : ${doorCode}
■ 체크인 시간 : 오후 3시 정각

*체크인 시간 전에 도착하신 분들은 잠시 라운지에서 기다려주세요. 편안한 소파와 음악, 음료가 준비되어 있습니다 (위치 : 입구 정원을 바라보고 오른쪽 별채)

-주요 이용규칙 안내-

[비대면 운영관련 유의사항]
시설 이용간 이용객의 부주의로 인해 발생한 문제 또는 사고에 대한 모든 책임은 이용객에게 있으며 비대면 운영의 특성 상 발생한 문제에 대해 자체적으로 대처해야 합니다. 

[시설보호의 의무]
시설 이용간 시설의 훼손, 파손, 고장, 분실, 오염, 도난, 사고 등을 방지하기 위해 이용객은 최선을 다해야하며 이용객의 부주의로 인해 발생한 피해에 대하여 추가 비용(손해배상)이 청구될 수 있습니다. 

[퇴실시간 엄수 : 오전 10시 30분]
체크아웃 시간을 넘겨서 퇴실하는 경우 퇴실 당일 숙박요금의 50%의 추가요금이 부과됩니다 (퇴실 시 현장결제)

[퇴실정리]
주방, BBQ 등은 사용 후에 직접 정리하고 일반/플라스틱/유리병/음식물쓰레기는 꼭 분리수거하여야 합니다. 

자세한 시설이용방법과 공간별 비품위치 등은 “이용안내서”를 참고해주세요

■ TERENE UNMU 이용 안내서 링크
<링크> : https://drive.google.com/file/d/1RP5g0gQMKbE5e8WP_nu2lADhyl3Gdy3q/view?usp=drive_link

이용 간 불편 및 문의 사항은 카카오톡채널(ID : TERENE) 문의를 통해 부탁드립니다`;
        };

//         const message_H_admin = (order) => {
//             return `[TERENE ${order.order_product}]
// ${order.reserver_name}님이 3시간 뒤, 입실 예정입니다.
// 청소/세팅을 마친 라운지 문은 열어두시기 바랍니다.

// 예약정보

// 1. 예약번호 : ${order.order_id}
// 2. 회원번호 : ${order.membership_number || "비회원 예약"}
// 3. 이름 : ${order.reserver_name}
// 4. 연락처 : ${order.reserver_contact}
// 5. 지점 : TERENE ${order.order_product}
// 6. 숙박 일정 : ${order.start_date}~${order.end_date}
// 7. 숙박 인원 : 성인 ${order.adult}명, 아동/유아 ${order.child}명
// 8. 결제 금액 : ${Number(order.final_price).toLocaleString()}원

// * 자세한 정보는 관리자 페이지( https://terene.kr/admin-table )에서 확인해주시기 바랍니다.`;
//         };

        const message_I_customer = (order) => {
            return `[TERENE ${order.order_product}]
아쉽지만 체크아웃 30분 전 안내를 드립니다.
지금부터 라운지는 청소를 위해 이용이 제한됩니다.

다음 고객을 위해 체크아웃시간은 꼭 지켜주세요. 

TERENE ${order.order_product}를 방문해주셔서 진심으로 감사드립니다.
이곳에서의 시간이 머문 모두에게 소중한 추억이 되었기를 바랍니다.

감사합니다`;
        };

//         const message_I_admin = (order) => {
//             return `[TERENE ${order.order_product}]
// ${order.reserver_name}님이 30분 뒤, 퇴실 예정입니다.

// 예약정보

// 1. 예약번호 : ${order.order_id}
// 2. 회원번호 : ${order.membership_number || "비회원 예약"}
// 3. 이름 : ${order.reserver_name}
// 4. 연락처 : ${order.reserver_contact}
// 5. 지점 : TERENE ${order.order_product}
// 6. 숙박 일정 : ${order.start_date}~${order.end_date}
// 7. 숙박 인원 : 성인 ${order.adult}명, 아동/유아 ${order.child}명
// 8. 결제 금액 : ${Number(order.final_price).toLocaleString()}원

// * 자세한 정보는 관리자 페이지( https://terene.kr/admin-table )에서 확인해주시기 바랍니다.`;
//         };

        for (const order of acceptedOrders) {
            const checkinDate = new Date(order.start_date);
            const checkoutDate = new Date(order.end_date);
            const today = new Date(kst.getFullYear(), kst.getMonth(), kst.getDate());
            const dayBeforeCheckin = new Date(checkinDate);
            dayBeforeCheckin.setDate(dayBeforeCheckin.getDate() - 1);
            const isSameDate = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

            const shouldSendMessageG = isAround(kstHours, kstMinutes, 8, 0) && isSameDate(today, checkinDate);
            const shouldSendMessageH = isAround(kstHours, kstMinutes, 12, 0) && isSameDate(today, checkinDate);
            const shouldSendMessageI = isAround(kstHours, kstMinutes, 10, 0) && isSameDate(today, checkoutDate);
            if (!shouldSendMessageG && !shouldSendMessageH && !shouldSendMessageI) {
                continue;
            }

            // Message G
            if (shouldSendMessageG) {
                const customer_msg = message_G_customer(order);
                const admin_msg = message_G_admin(order);
                await sendScheduledEmail({
                    to: order.reserver_email,
                    subject: `[TERENE ${order.order_product}] 오시는 길 및 체크인 시간 안내`,
                    message: customer_msg,
                    platform: 'gmail',
                });
                await sendScheduledSMS({
                    to: order.reserver_contact.replace(/-/g, ''),
                    message: customer_msg,
                });

                // 관리자에게도 동일한 메시지 전송
                await sendScheduledEmail({
                    to: 'reserve@terene.kr',
                    subject: `[TERENE ${order.order_product}] ${order.order_id || "비회원"} ${order.reserver_name}님 입실 당일 안내`,
                    message: admin_msg,
                    platform: 'gmail',
                });
                await sendScheduledSMS({
                    to: '01024497802',
                    message: admin_msg,
                });
            }

            // Message H
            if (shouldSendMessageH) {
                const customer_msg = message_H_customer(order);
                // const admin_msg = message_H_admin(order);
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

                // 관리자에게도 동일한 메시지 전송
                // await sendScheduledEmail({
                //     to: 'reserve@terene.kr',
                //     subject: `[TERENE ${order.order_product}] ${order.order_id || "비회원"} ${order.reserver_name}님 입실 3시간 전 안내`,
                //     message: admin_msg,
                //     platform: 'gmail',
                // });
                // await sendScheduledSMS({
                //     to: '01024497802',
                //     message: admin_msg,
                // });
            }

            // Message I
            if (shouldSendMessageI) {
                const customer_msg = message_I_customer(order);
                // const admin_msg = message_I_admin(order);
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

                // 관리리자에게도 동일한 메시지 전송
                // await sendScheduledEmail({
                //     to: 'reserve@terene.kr',
                //     subject: `[TERENE ${order.order_product}] ${order.order_id || "비회원"} ${order.reserver_name}님 퇴실 30분 전 안내`,
                //     message: admin_msg,
                //     platform: 'gmail',
                // });
                // await sendScheduledSMS({
                //     to: '01024497802',
                //     message: admin_msg,
                // });
            }
        }

    } catch (error) {
      console.error('❌ 자동 작업 중 에러 발생:', error.message);
    }
  });
}

module.exports = startScheduledJobs;
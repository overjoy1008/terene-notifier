const cron = require('node-cron');
const axios = require('axios');
require('dotenv').config();

function startScheduledJobs() {
  cron.schedule('0,15,30,45 * * * *', async () => {
    try {
      if (
        process.env.SENDER_EMAIL_USER === 'overjoy1008@gmail.com' ||
        process.env.SENDER_PHONE === '01023705710'
      ) return;

      const { data: orders } = await axios.get('https://terene-db-server.onrender.com/api/v2/orders');
      const acceptedOrders = orders.filter(order => order.reservation_status === 'confirmed');

      const now = new Date();   
      const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
      const kstHours = kst.getHours();
      const kstMinutes = kst.getMinutes();

      const isAround = (hour, minute, targetHour, targetMinute, margin = 5) => {
        const total = hour * 60 + minute;
        const target = targetHour * 60 + targetMinute;
        return Math.abs(total - target) <= margin;
      };

      const isSameDate = (a, b) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();

      for (const order of acceptedOrders) {
        const checkinDate = new Date(order.checkin_date);
        const checkoutDate = new Date(order.checkout_date);
        const today = new Date(kst.getFullYear(), kst.getMonth(), kst.getDate());

        const shouldSendG = isAround(kstHours, kstMinutes, 8, 0) && isSameDate(today, checkinDate);
        const shouldSendH = isAround(kstHours, kstMinutes, 12, 0) && isSameDate(today, checkinDate);
        const shouldSendI = isAround(kstHours, kstMinutes, 10, 0) && isSameDate(today, checkoutDate);
        const shouldUpdateStatus = isAround(kstHours, kstMinutes, 10, 30);

        // ✅ 추가: stay_status 자동 업데이트
        if (shouldUpdateStatus) {
          const stayHistory = order.stay_history || [];

          // 체크인 상태로 전환
          if (isSameDate(today, checkinDate) && order.stay_status !== 'checked_in') {
            const updatedHistory = [
              { status: 'checked_in', timestamp: kst.toISOString() },
              { status: 'checked_out', timestamp: null },
            ];
            await axios.put(`https://terene-db-server.onrender.com/api/v2/orders/${order.order_id}`, {
              ...order,
              stay_status: 'checked_in',
              stay_history: updatedHistory,
            });
            console.log(`✅ [체크인 상태로 전환] ${order.order_id}`);
          }

          // 체크아웃 상태로 전환
          else if (isSameDate(today, checkoutDate) && order.stay_status !== 'checked_out') {
            const checkedInRecord = stayHistory.find(s => s.status === 'checked_in') || { timestamp: null };
            const updatedHistory = [
              { status: 'checked_in', timestamp: checkedInRecord.timestamp },
              { status: 'checked_out', timestamp: kst.toISOString() },
            ];
            await axios.put(`https://terene-db-server.onrender.com/api/v2/orders/${order.order_id}`, {
              ...order,
              stay_status: 'checked_out',
              stay_history: updatedHistory,
            });
            console.log(`✅ [체크아웃 상태로 전환] ${order.order_id}`);
          }
        }

        if (!shouldSendG && !shouldSendH && !shouldSendI) continue;

        const orderParamsG_customer = {
          stay_location: order.stay_location,
          reserver_name: order.stay_info.name,
          arrival_link: 'http://pf.kakao.com/_xexjbTn/chat'
        };

        const orderParamsG_admin = {
          stay_location: order.stay_location,
          reserver_name: order.stay_info.name,
          order_id: order.old_order_id ? `${order.order_id} (구 ${order.old_order_id})` : order.order_id,
          membership_number: order.membership_number || "비회원",
          reserver_contact: order.stay_info.contact,
          checkin_date: order.checkin_date,
          checkout_date: order.checkout_date, 
          adult: order.stay_people.adult,
          youth: order.stay_people.teenager || 0,
          child: order.stay_people.child || 0,
          special_requests: order.stay_details.special_requests || "-",
          services: (order.service_price.services || []).map(s => s.type).join(', ') || "-",
          admin_notes: order.stay_details.admin_notes || "-",
        };

        const orderParamsH = {
          stay_location: order.stay_location,
          reserver_name: order.stay_info.name,
          door_code: order.reserver_contact.replace(/-/g, '').slice(-4),
        };

        const orderParamsI = {
          stay_location: order.stay_location,
        };

        if (shouldSendG) {

          await axios.post(`https://terene-notifier-server.onrender.com/api/kakao/v2`, {
            receiver_phone: order.stay_info.contact.replace(/-/g, ''),
            template_type: 'G_customer',
            params: orderParamsG_customer,
          });

          for (const adminPhone of ['01028891548', '01074994590']) {
            await axios.post(`https://terene-notifier-server.onrender.com/api/kakao/v2`, {
              receiver_phone: adminPhone,
              template_type: 'G_admin',
              params: orderParamsG_admin,
            });
          }
        }

        if (shouldSendH) {

          await axios.post(`https://terene-notifier-server.onrender.com/api/kakao/v2`, {
            receiver_phone: order.stay_info.contact.replace(/-/g, ''),
            template_type: 'H',
            params: orderParamsH,
          });
        }

        if (shouldSendI) {

          await axios.post(`https://terene-notifier-server.onrender.com/api/kakao/v2`, {
            receiver_phone: order.stay_info.contact.replace(/-/g, ''),
            template_type: 'I',
            params: orderParamsI,
          });
        }
      }
    } catch (error) {
      console.error('❌ 자동 작업 중 에러:', error.message);
    }
  });
}

module.exports = startScheduledJobs;

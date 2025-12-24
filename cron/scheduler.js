const cron = require('node-cron');
const axios = require('axios');
require('dotenv').config();

async function fetchAdminContacts() {
  const res = await axios.get("https://terene-db-server.onrender.com/api/v3/admin-contacts")
  if (!res.status || res.status !== 200) throw new Error("failed to fetch admin contacts")
  const all = Array.isArray(res.data) ? res.data : []

  const valid = all.filter(
    (a) => a.checkinout_alert === true && a.quiet_mode === false
  )

  const adminPhones = valid
    .filter((a) => a.phone && a.phone.trim() !== "")
    .map((a) => a.phone)

  const adminEmails = valid
    .filter((a) => a.email && a.email.trim() !== "")
    .map((a) => a.email)

  return { adminPhones, adminEmails }
}


function startScheduledJobs() {
  cron.schedule('0,30 * * * *', async () => {
    try {
      if (
        process.env.SENDER_EMAIL_USER === 'overjoy1008@gmail.com' ||
        process.env.SENDER_PHONE === '01023705710'
      ) return;

      const [{ data: orders }, { data: cancellations }] = await Promise.all([
        axios.get('https://terene-db-server.onrender.com/api/v2/orders'),
        axios.get('https://terene-db-server.onrender.com/api/v2/cancellations'),
      ]);

      const cancelledIds = new Set(
        (Array.isArray(cancellations) ? cancellations : []).map(c => c.order_id)
      );

      // "confirmed" 이면서, cancellations에 자신(order_id)이 없는 건만 진행
      const acceptedOrders = (Array.isArray(orders) ? orders : []).filter(
        order =>
          order?.reservation_status === 'confirmed' &&
          !cancelledIds.has(order?.order_id)
      );

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

      const isD1Date = (a, b) => {
        const aDate = new Date(a.getFullYear(), a.getMonth(), a.getDate());
        const bDate = new Date(b.getFullYear(), b.getMonth(), b.getDate());
        const diffTime = bDate - aDate;
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        return diffDays === 1;
      };

      const isD7Date = (a, b) => {
        const aDate = new Date(a.getFullYear(), a.getMonth(), a.getDate());
        const bDate = new Date(b.getFullYear(), b.getMonth(), b.getDate());
        const diffTime = bDate - aDate;
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        return diffDays === 7;
      };

      function toKSTISOString(date) {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        const ss = String(date.getSeconds()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}+09:00`;
      }

      const { adminPhones, adminEmails } = await fetchAdminContacts();

      for (const order of acceptedOrders) {
        const checkinDate = new Date(order.checkin_date);
        const checkoutDate = new Date(order.checkout_date);
        const today = new Date(kst.getFullYear(), kst.getMonth(), kst.getDate());

        const shouldSendG = isAround(kstHours, kstMinutes, 8, 0) && isSameDate(today, checkinDate);
        const shouldSendH = isAround(kstHours, kstMinutes, 12, 0) && isSameDate(today, checkinDate);
        const shouldSendI = isAround(kstHours, kstMinutes, 10, 0) && isSameDate(today, checkoutDate);
        const shouldUpdateStatus = isAround(kstHours, kstMinutes, 10, 30);

        const shouldSendGForeign = isAround(kstHours, kstMinutes, 8, 0) && isD7Date(today, checkinDate);
        const shouldSendHForeign = isAround(kstHours, kstMinutes, 8, 0) && isD1Date(today, checkinDate);
        const shouldSendIForeign = isAround(kstHours, kstMinutes, 10, 30) && isSameDate(today, checkoutDate);

        const lang = order.nationality === 'foreign' ? "foreign_en" : "toss_kr";

        if (shouldUpdateStatus) {
          const stayHistory = order.stay_history || [];

          // 체크인 상태로 전환
          if (isSameDate(today, checkinDate) && order.stay_status !== 'checked_in') {
            const updatedHistory = [
              { status: 'checked_in', timestamp: toKSTISOString(kst) },
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
              { status: 'checked_out', timestamp: toKSTISOString(kst) },
            ];
            await axios.put(`https://terene-db-server.onrender.com/api/v2/orders/${order.order_id}`, {
              ...order,
              stay_status: 'checked_out',
              stay_history: updatedHistory,
            });
            console.log(`✅ [체크아웃 상태로 전환] ${order.order_id}`);
          }
        }

        if (!shouldSendG && !shouldSendH && !shouldSendI && !shouldSendGForeign && !shouldSendHForeign && !shouldSendIForeign) continue;

        const orderParamsG_customer = {
          stay_location: order.stay_location,
          reserver_name: order.stay_info.name,
          arrival_link: 'http://pf.kakao.com/_xexjbTn/chat'
        };

        // 추가 서비스별 단가 매핑 테이블 (임시)
        const SERVICE_INFO = {
          "BBQ 용품 준비":        { unitPrice: 25000, unitLabel: "회" },
          "BBQ 식재료 준비":      { unitPrice: 20000, unitLabel: "인" },
          "모닝 스트레칭 클래스": { unitPrice: 0,     unitLabel: "인" },
          "케이터링 서비스":    { unitPrice: 0, unitLabel: "인" },
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
          services:
            (order.service_price.services || [])
              .map(s => {
                const info = SERVICE_INFO[s.type] || { unitPrice: 0, unitLabel: "회" };
                const { unitPrice, unitLabel } = info;
                const count = unitPrice > 0 ? Math.round(s.amount / unitPrice) : 1;
                return `${s.type} (${count}${unitLabel})`;
              })
              .join(', ') || "-",
          admin_notes: order.admin_notes || "-",
        };

        const orderParamsH = {
          stay_location: order.stay_location,
          reserver_name: order.stay_info.name,
          door_code: order.reserver_contact.replace(/[^0-9]/g, '').slice(-4),
        };

        const orderParamsI = {
          stay_location: order.stay_location,
          reserver_name: order.stay_info.name,
        };

        if (shouldSendG && lang !== "foreign_en") {
          try {
            await axios.post(`https://terene-notifier-server.onrender.com/api/kakao/v2`, {
              receiver_phone: order.stay_info.contact.replace(/-/g, ''),
              template_type: 'G_customer',
              params: orderParamsG_customer,
            });
          } catch {}
          try {
            for (const adminPhone of adminPhones || []) {
              await axios.post(`https://terene-notifier-server.onrender.com/api/kakao/v2`, {
                receiver_phone: adminPhone.replace(/-/g, ''),
                template_type: 'G_admin',
                params: orderParamsG_admin,
              });
            }
          } catch {}
          try {
            for (const adminEmail of adminEmails || []) {
              await axios.post(`https://terene-notifier-server.onrender.com/api/email/v2`, {
                receiver_email: adminEmail,
                template_type: 'G_admin',
                platform: 'gmail',
                params: orderParamsG_admin,
              });
            }
          } catch {}
        }

        if (shouldSendGForeign && lang === "foreign_en") {
          try {
            await axios.post(`https://terene-notifier-server.onrender.com/api/email/v2`, {
              receiver_email: order.reserver_email,
              template_type: 'G_customer',
              platform: 'gmail',
              params: orderParamsG_customer,
              lang: lang,
            });
          } catch {}
          try {
            for (const adminPhone of adminPhones || []) {
              await axios.post(`https://terene-notifier-server.onrender.com/api/kakao/v2`, {
                receiver_phone: adminPhone.replace(/-/g, ''),
                template_type: 'G_admin',
                params: orderParamsG_admin,
              });
            }
          } catch {}
          try {
            for (const adminEmail of adminEmails || []) {
              await axios.post(`https://terene-notifier-server.onrender.com/api/email/v2`, {
                receiver_email: adminEmail,
                template_type: 'G_admin',
                platform: 'gmail',
                params: orderParamsG_admin,
              });
            }
          } catch {}
        }



        if (shouldSendH && lang !== "foreign_en") {
          await axios.post(`https://terene-notifier-server.onrender.com/api/kakao/v2`, {
            receiver_phone: order.stay_info.contact.replace(/-/g, ''),
            template_type: 'H',
            params: orderParamsH,
          });
        }

        if (shouldSendHForeign && lang === "foreign_en") {
          await axios.post(`https://terene-notifier-server.onrender.com/api/email/v2`, {
            receiver_email: order.reserver_email,
            template_type: 'H',
            platform: 'gmail',
            params: orderParamsH,
            lang: lang,
          });
        }



        if (shouldSendI && lang !== "foreign_en") {
          await axios.post(`https://terene-notifier-server.onrender.com/api/kakao/v2`, {
            receiver_phone: order.stay_info.contact.replace(/-/g, ''),
            template_type: 'I',
            params: orderParamsI,
          });
        }

        if (shouldSendIForeign && lang === "foreign_en") {
          await axios.post(`https://terene-notifier-server.onrender.com/api/email/v2`, {
            receiver_email: order.reserver_email,
            template_type: 'I',
            platform: 'gmail',
            params: orderParamsI,
            lang: lang,
          });
        }
      }
    } catch (error) {
      console.error('❌ 자동 작업 중 에러:', error.message);
    }
  });
}

module.exports = startScheduledJobs;

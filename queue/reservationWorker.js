const { take } = require("./reservationQueue")

function kst(d = new Date()) {
  const t = d.getTime() + d.getTimezoneOffset() * 60000 + 9 * 3600000
  return new Date(t)
}
function kstISO(d = new Date()) {
  const x = kst(d)
  const z = (n) => String(n).padStart(2, "0")
  return `${x.getFullYear()}-${z(x.getMonth()+1)}-${z(x.getDate())}T${z(x.getHours())}:${z(x.getMinutes())}:${z(x.getSeconds())}+09:00`
}
function rid(n = 6) {
  const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let s = ""; for (let i=0;i<n;i++) s += c[Math.floor(Math.random()*c.length)]
  return s
}

async function fetchJSON(url, init) {
  const r = await fetch(url, init)
  if (!r.ok) throw new Error(`${init?.method||"GET"} ${url} ${r.status}`)
  return r.json()
}

async function fetchAdminContacts() {
  const res = await fetch("https://terene-db-server.onrender.com/api/v3/admin-contacts")
  if (!res.ok) throw new Error("failed to fetch admin contacts")
  const all = await res.json()

  const valid = all.filter(
    (a) => a.reservation_alert === true && a.quiet_mode === false
  )

  const adminPhones = valid
    .filter((a) => a.phone && a.phone.trim() !== "")
    .map((a) => a.phone)

  const adminEmails = valid
    .filter((a) => a.email && a.email.trim() !== "")
    .map((a) => a.email)

  return { adminPhones, adminEmails }
}

// async function updateDaysOccupancy(orderData, occupied) {
//   const allDays = await fetchJSON(`https://terene-db-server.onrender.com/api/days`)
//   const dateRange = []
//   let cur = new Date(orderData.checkin_date)
//   const end = new Date(orderData.checkout_date)
//   while (cur <= end) {
//     dateRange.push(cur.toISOString().split("T")[0])
//     cur.setDate(cur.getDate() + 1)
//   }
//   const targets = allDays.filter((d) => dateRange.includes(d.date))
//   for (const day of targets) {
//     const x = { ...day }
//     const payload = occupied
//       ? { is_occupied: true,  occupied_order_id: orderData.order_id }
//       : { is_occupied: false, occupied_order_id: null }
//     if (day.date === orderData.checkin_date) x.checkin = payload
//     else if (day.date === orderData.checkout_date) x.checkout = payload
//     else { x.checkin = payload; x.checkout = payload }
//     const r = await fetch(`https://terene-db-server.onrender.com/api/days/${day.date}`, {
//       method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(x),
//     })
//     if (!r.ok) throw new Error(`occupancy ${occupied?"set":"clear"} failed: ${day.date}`)
//   }
// }

async function updateDaysOccupancy(orderData, occupied) {
  // ✅ 새 엔드포인트: /api/v3/days
  const allDays = await fetchJSON(`https://terene-db-server.onrender.com/api/v3/days`)

  // ✅ checkin~checkout 구간 날짜 리스트 생성
  const dateRange = []
  let cur = new Date(orderData.checkin_date)
  const end = new Date(orderData.checkout_date)
  while (cur <= end) {
    dateRange.push(cur.toISOString().split("T")[0])
    cur.setDate(cur.getDate() + 1)
  }

  // ✅ 해당 날짜들만 추출
  const targets = allDays.filter((d) => dateRange.includes(d.date))

  // ✅ location 기반 date_id 생성 규칙
  const location = orderData.stay_location || "UNMU"

  for (const day of targets) {
    const payload = { ...day }

    // ✅ occupancy 상태 설정
    const isOcc = occupied ? true : false
    const occId = occupied ? orderData.order_id : null

    // ✅ 날짜별 로직 분기
    if (day.date === orderData.checkin_date) {
      payload.checkin_occupied = isOcc
      payload.checkin_order_id = occId
    } else if (day.date === orderData.checkout_date) {
      payload.checkout_occupied = isOcc
      payload.checkout_order_id = occId
    } else {
      payload.checkin_occupied = isOcc
      payload.checkin_order_id = occId
      payload.checkout_occupied = isOcc
      payload.checkout_order_id = occId
    }

    // ✅ date_id 생성 (YYYY-MM-DD_LOCATION)
    const date_id = `${day.date}_${location}`

    // ✅ PUT 요청
    const r = await fetch(`https://terene-db-server.onrender.com/api/v3/days/${date_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!r.ok) {
      throw new Error(
        `occupancy ${occupied ? "set" : "clear"} failed: ${day.date_id || date_id} (${r.status})`
      )
    }
  }
}



async function restoreCouponsAndMileage_OnCancel(orderData) {
  try {
    const couponRes = await fetch(`https://terene-db-server.onrender.com/api/v2/coupon-instances`)
    if (couponRes.ok) {
      const allCoupons = await couponRes.json()
      const primary = orderData.discounted_price?.primary_coupons || []
      const secondary = orderData.discounted_price?.secondary_coupons || []
      const entries = primary.length === 0 ? [...secondary] : [...primary, ...secondary]

      for (const entry of entries) {
        const matches = allCoupons.filter((i) => i.coupon_instance_id === entry.coupon_id && i.status === "used")
        for (const instance of matches) {
          try {
            const defRes = await fetch(`https://terene-db-server.onrender.com/api/v2/coupon-definitions/${instance.coupon_definition_id}`)
            if (!defRes.ok) continue
            const def = await defRes.json()
            if (def.counter >= 1) {
              const updated = {
                ...instance,
                status: "available",
                order_id: null,
                used_location: null,
                used_timestamp: null,
                used_amount: null,
              }
              await fetch(`https://terene-db-server.onrender.com/api/v2/coupon-instances/${instance.coupon_instance_id}`, {
                method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated),
              })
            }
          } catch {}
        }
      }

      const miEntries = (orderData.discounted_price?.secondary_coupons || [])
        .filter((e) => typeof e.coupon_id === "string" && e.coupon_id.startsWith("MI"))
      if (miEntries.length > 0) {
        const z = (n) => String(n).padStart(2, "0")
        const nowK = kst()
        const yy = String(nowK.getFullYear()).slice(2)
        const mm = z(nowK.getMonth()+1)
        const dd = z(nowK.getDate())
        const HH = z(nowK.getHours())
        const MM = z(nowK.getMinutes())
        const rid8 = (n = 8) => {
          const c = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789"
          let s = ""; for (let i=0;i<n;i++) s += c[Math.floor(Math.random()*c.length)]
          return s
        }
        for (const e of miEntries) {
          const mileageId = `MI-${yy}${mm}${dd}-${HH}${MM}-${rid8(8)}`
          const payload = {
            mileage_id: mileageId,
            membership_number: orderData.membership_number,
            issued_at: kstISO(),
            mileage_amount: Math.abs(Number(e.amount || 0)),
            mileage_type: "accumulate",
            description: `예약 취소 복구: ${Number(e.amount||0).toLocaleString()}p`,
            mileage_due: null,
            order_id: orderData.order_id,
          }
          await fetch(`https://terene-db-server.onrender.com/api/v2/mileages`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
          })
        }
      }
    }
  } catch {}
}

async function processJobA(payload) {
  const { orderId, amount, paymentKey, isFree, templateParams, templateParamsB } = payload
  const { adminPhones, adminEmails } = await fetchAdminContacts()

  const orderRes = await fetch(`https://terene-db-server.onrender.com/api/v2/orders/${orderId}`)
  if (!orderRes.ok) throw new Error("order fetch failed")
  const orderData = await orderRes.json()
  if (orderData.reservation_status !== "pending") throw new Error("already processed")

  const now = kst()
  const nowISO = kstISO(new Date())
  const dateStr = now.toISOString().slice(2, 10).replace(/-/g, "")
  const timeStr = String(now.getHours()).padStart(2, "0") + String(now.getMinutes()).padStart(2, "0")
  const paymentId = `P-${dateStr}-${timeStr}-${rid(6)}`

  const paymentPayload = {
    payment_id: paymentId,
    payment_type: "order",
    order_id: orderId,
    payment_info: {
      paymentKey: isFree ? null : paymentKey,
      same_as_reserver: true,
      name: orderData.reserver_name,
      birthdate: orderData.reserver_birthdate,
      contact: String(orderData.reserver_contact),
    },
    payment_method: isFree ? "Free" : "Toss Payments",
    payment_account: { is_vaadd: false, account_holder: null, bank_name: null, account_number: null },
    receiver_account: { is_vaadd: true, account_holder: null, bank_name: null, account_number: null },
    payment_due: kstISO(new Date(now.getTime() + 24 * 3600000)),
    price_paid: Number(amount),
    payment_status: "completed",
    payment_history: [
      { status: "pending", timestamp: nowISO },
      { status: "processing", timestamp: nowISO },
      { status: "completed", timestamp: nowISO },
    ],
  }

  const savePayment = await fetch("https://terene-db-server.onrender.com/api/v2/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(paymentPayload),
  })
  if (!savePayment.ok) throw new Error("payment save failed")

  const fullUpdatedOrder = {
    ...orderData,
    reservation_status: "confirmed",
    reservation_history: orderData.reservation_history.map((e) => (e.status === "confirmed" ? { status: "confirmed", timestamp: nowISO } : e)),
  }
  const updateOrder = await fetch(`https://terene-db-server.onrender.com/api/v2/orders/${orderId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fullUpdatedOrder),
  })
  if (!updateOrder.ok) throw new Error("order update failed")

  try {
    await updateDaysOccupancy(orderData, true)
  } catch {}

  try {
    const couponRes = await fetch("https://terene-db-server.onrender.com/api/v2/coupon-instances")
    if (couponRes.ok) {
      const allCoupons = await couponRes.json()
      const primary = fullUpdatedOrder.discounted_price?.primary_coupons || []
      const secondary = fullUpdatedOrder.discounted_price?.secondary_coupons || []
      const entries = primary.length === 0 ? [...secondary] : [...primary, ...secondary]
      const nowKST = kstISO()
      for (const entry of entries) {
        const matches = allCoupons.filter((i) => i.coupon_instance_id === entry.coupon_id && i.status === "available")
        for (const instance of matches) {
          try {
            const defRes = await fetch(`https://terene-db-server.onrender.com/api/v2/coupon-definitions/${instance.coupon_definition_id}`)
            if (!defRes.ok) continue
            const def = await defRes.json()
            if (def.counter >= 1) {
              const updated = {
                ...instance,
                status: "used",
                order_id: fullUpdatedOrder.order_id,
                used_location: fullUpdatedOrder.stay_location,
                used_timestamp: nowKST,
                used_amount: entry.amount,
              }
              await fetch(`https://terene-db-server.onrender.com/api/v2/coupon-instances/${instance.coupon_instance_id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updated),
              })
            }
          } catch {}
        }
      }
    }

    const miEntries = (fullUpdatedOrder.discounted_price?.secondary_coupons || []).filter((e) => typeof e.coupon_id === "string" && e.coupon_id.startsWith("MI"))
    if (miEntries.length > 0) {
      const z = (n) => String(n).padStart(2, "0")
      const nowK = kst()
      const yy = String(nowK.getFullYear()).slice(2)
      const mm = z(nowK.getMonth() + 1)
      const dd = z(nowK.getDate())
      const HH = z(nowK.getHours())
      const MM = z(nowK.getMinutes())
      const rid8 = (n = 8) => {
        const c = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789"
        let s = ""
        for (let i = 0; i < n; i++) s += c[Math.floor(Math.random() * c.length)]
        return s
      }
      for (const e of miEntries) {
        const mileageId = `MI-${yy}${mm}${dd}-${HH}${MM}-${rid8(8)}`
        const payload = {
          mileage_id: mileageId,
          membership_number: fullUpdatedOrder.membership_number,
          issued_at: kstISO(),
          mileage_amount: -Math.abs(Number(e.amount || 0)),
          mileage_type: "use",
          description: `예약 할인: ${e.amount.toLocaleString()}p`,
          mileage_due: null,
          order_id: orderId,
        }
        await fetch("https://terene-db-server.onrender.com/api/v2/mileages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }
    }
  } catch {}

  try {
    for (const p of adminPhones || []) {
      await fetch("https://terene-notifier-server.onrender.com/api/kakao/v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiver_phone: String(p).replace(/-/g, ""), template_type: "A", params: templateParams }),
      })
    }
  } catch {}
  try {
    for (const e of adminEmails || []) {
      await fetch("https://terene-notifier-server.onrender.com/api/email/v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiver_email: e, template_type: "A", platform: "gmail", params: templateParams }),
      })
    }
  } catch {}

  try {
    await fetch("https://terene-notifier-server.onrender.com/api/kakao/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        receiver_phone: String(orderData.reserver_contact).replace(/-/g, ""),
        template_type: "A",
        params: templateParamsB || templateParams,
      }),
    })
  } catch {}
  try {
    await fetch("https://terene-notifier-server.onrender.com/api/email/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        receiver_email: orderData.reserver_email,
        template_type: "A",
        platform: "gmail",
        params: templateParamsB || templateParams,
      }),
    })
  } catch {}
  try {
    if (!orderData.stay_info?.same_as_reserver && orderData.stay_info?.contact) {
      await fetch("https://terene-notifier-server.onrender.com/api/kakao/v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiver_phone: String(orderData.stay_info.contact).replace(/-/g, ""),
          template_type: "A",
          params: templateParamsB || templateParams,
        }),
      })
    }
  } catch {}
}

async function processJobCD(payload) {
  const { orderId, actor, cancelMode } = payload
  const { adminPhones, adminEmails } = await fetchAdminContacts()

  const orderRes = await fetch(`https://terene-db-server.onrender.com/api/v2/orders/${orderId}`)
  if (!orderRes.ok) throw new Error("order fetch failed")
  const orderData = await orderRes.json()

  const now = kst()
  const nowISO = kstISO(new Date())
  const dateStr = now.toISOString().slice(2,10).replace(/-/g,"")
  const timeStr = `${String(now.getHours()).padStart(2,"0")}${String(now.getMinutes()).padStart(2,"0")}`
  const cancellationId = `C-${dateStr}-${timeStr}-${rid(6)}`

  const diffDays = Math.floor((new Date(orderData.checkin_date).getTime() - now.getTime()) / (1000*60*60*24))

  const lodgingBase = (orderData.discounted_price?.amount || 0) * 1.1
  const serviceBase = (orderData.service_price?.amount || 0) * 1.1
  const deposit = orderData.deposit_price || 0

  const lodgingRate = actor==="admin" ? 1.0 : (diffDays>=31 ? 1.0 : diffDays>=15 ? 0.8 : diffDays>=10 ? 0.6 : 0.0)
  const serviceRate = actor==="admin" ? 1.0 : (diffDays>=10 ? 1.0 : 0.0)

  const lodgingRefund = lodgingBase * lodgingRate
  const serviceRefund = serviceBase * serviceRate
  const depositRefund = deposit * 1.0
  const totalRefund = Math.round(lodgingRefund + serviceRefund + depositRefund)

  const isPaidFlow = cancelMode === "cancel"
  const cancellationPayload = isPaidFlow
    ? { cancellation_id: cancellationId, order_id: orderId, cancel_person: actor, cancel_type: "paid_cancel",
        cancel_status: "pending",
        cancel_history: [{status:"pending",timestamp:nowISO},{status:"processing",timestamp:null},{status:"completed",timestamp:null}] }
    : { cancellation_id: cancellationId, order_id: orderId, cancel_person: actor, cancel_type: "unpaid_cancel",
        cancel_status: "completed",
        cancel_history: [{status:"pending",timestamp:nowISO},{status:"processing",timestamp:nowISO},{status:"completed",timestamp:nowISO}] }

  const cRes = await fetch(`https://terene-db-server.onrender.com/api/v2/cancellations`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cancellationPayload),
  })
  if (!cRes.ok) throw new Error("cancellation create failed")

  await updateDaysOccupancy(orderData, false)
  await restoreCouponsAndMileage_OnCancel(orderData)

  if (isPaidFlow) {
    const payAll = await fetchJSON(`https://terene-db-server.onrender.com/api/v2/payments`)
    const originalPayment = payAll.find((p) => p.order_id===orderId && p.payment_type==="order")
    if (!originalPayment) throw new Error("original payment not found")

    const paymentId = `P-${dateStr}-${timeStr}-${rid(6)}`
    const paymentPayload = {
      payment_id: paymentId,
      payment_type: "refund",
      order_id: orderId,
      payment_info: originalPayment.payment_info,
      payment_method: "Toss Payments Refund",
      payment_account: originalPayment.receiver_account,
      receiver_account: originalPayment.payment_account,
      payment_due: kstISO(new Date(now.getTime()+24*3600000)),
      price_paid: totalRefund,
      payment_status: "pending",
      payment_history: [{status:"pending",timestamp:nowISO},{status:"processing",timestamp:null},{status:"completed",timestamp:null}],
    }
    const pRes = await fetch(`https://terene-db-server.onrender.com/api/v2/payments`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(paymentPayload),
    })
    if (!pRes.ok) throw new Error("refund payment create failed")

    const templateParamsB = {
      stay_location: `${orderData.stay_location}`,
      reserver_name: orderData.stay_info?.name || orderData.reserver_name,
      order_id: orderData.order_id,
      membership_number: orderData.membership_number || "비회원 예약",
      reserver_contact: String(orderData.stay_info?.contact || orderData.reserver_contact),
      checkin_date: orderData.checkin_date,
      checkout_date: orderData.checkout_date,
      adult: String(orderData.stay_people?.adult),
      youth: String(orderData.stay_people?.teenager || "0"),
      child: String(orderData.stay_people?.child),
      final_price: String(Number(orderData.final_price ?? "0").toLocaleString()),
    }

    try {
      for (const p of adminPhones || []) {
        await fetch(`https://terene-notifier-server.onrender.com/api/kakao/v2`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ receiver_phone: String(p).replace(/-/g,""), template_type: "C", params: templateParamsB }),
        })
      }
    } catch {}

    try {
      for (const e of adminEmails || []) {
        await fetch(`https://terene-notifier-server.onrender.com/api/email/v2`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ receiver_email: e, template_type: "C", platform: "gmail", params: templateParamsB }),
        })
      }
    } catch {}

    // await fetch(`https://terene-notifier-server.onrender.com/api/kakao/v2`, {
    //   method: "POST", headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ receiver_phone: String(orderData.reserver_contact).replace(/-/g,""), template_type: "C", params: templateParamsB }),
    // })
  }
}

async function processJobEF(payload) {
  const { orderId, forceTemplate } = payload
  const { adminPhones, adminEmails } = await fetchAdminContacts()

  const now = kst()
  const nowISO = kstISO(new Date())

  const orderData = await fetchJSON(`https://terene-db-server.onrender.com/api/v2/orders/${orderId}`)
  const cancellations = await fetchJSON(`https://terene-db-server.onrender.com/api/v2/cancellations`)
  const payments = await fetchJSON(`https://terene-db-server.onrender.com/api/v2/payments`)

  const targetCancellation = cancellations.find((c) => c.order_id===orderId && c.cancel_type==="paid_cancel")
  if (!targetCancellation) throw new Error("no paid_cancel")

  const targetPayment = payments.find((p) => p.order_id===orderId && p.payment_type==="refund" && p.payment_status!=="completed")
  if (!targetPayment) throw new Error("no refund payment pending")

  const pendingTs = targetCancellation.cancel_history?.find((h)=>h.status==="pending")?.timestamp || nowISO
  const diffDays = Math.floor((new Date(orderData.checkin_date).getTime() - new Date(pendingTs).getTime())/(1000*60*60*24))

  const lodgingBase = (orderData.discounted_price?.amount || 0) * 1.1
  const serviceBase = (orderData.service_price?.amount || 0) * 1.1
  const deposit = orderData.deposit_price || 0

  const isCustomer = targetCancellation.cancel_person === "customer"
  const lodgingRate = isCustomer ? (diffDays>=31 ? 1.0 : diffDays>=15 ? 0.8 : diffDays>=10 ? 0.6 : 0.0) : 1.0
  const serviceRate = isCustomer ? (diffDays>=10 ? 1.0 : 0.0) : 1.0

  const lodgingRefund = lodgingBase * lodgingRate
  const serviceRefund = serviceBase * serviceRate
  const depositRefund = deposit * 1.0
  const totalRefund = Math.round(lodgingRefund + serviceRefund + depositRefund)

  const updatedPayment = {
    ...targetPayment,
    payment_status: "completed",
    payment_history: [
      { status: "pending",    timestamp: targetPayment.payment_history?.find((h)=>h.status==="pending")?.timestamp || nowISO },
      { status: "processing", timestamp: nowISO },
      { status: "completed",  timestamp: nowISO },
    ],
  }
  await fetch(`https://terene-db-server.onrender.com/api/v2/payments/${targetPayment.payment_id}`, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updatedPayment),
  })

  const updatedCancellation = {
    ...targetCancellation,
    cancel_status: "completed",
    cancel_history: [
      { status: "pending",    timestamp: targetCancellation.cancel_history?.find((h)=>h.status==="pending")?.timestamp || nowISO },
      { status: "processing", timestamp: nowISO },
      { status: "completed",  timestamp: nowISO },
    ],
  }
  await fetch(`https://terene-db-server.onrender.com/api/v2/cancellations/${targetCancellation.cancellation_id}`, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updatedCancellation),
  })

  const refundId = (() => {
    const dateStr = now.toISOString().slice(2,10).replace(/-/g,"")
    const timeStr = `${String(now.getHours()).padStart(2,"0")}${String(now.getMinutes()).padStart(2,"0")}`
    return `R-${dateStr}-${timeStr}-${rid(6)}`
  })()

  const refundPayload = {
    refund_id: refundId,
    order_id: orderId,
    payment_id: targetPayment.payment_id,
    refund_price: totalRefund,
    refund_details: {
      days_before_checkin: diffDays,
      discounted_w_vat: Math.round(lodgingRefund),
      service_w_vat: Math.round(serviceRefund),
      deposit: Math.round(depositRefund),
    },
    refund_status: "completed",
    refund_history: [
      { status: "pending", timestamp: nowISO },
      { status: "processing", timestamp: nowISO },
      { status: "completed", timestamp: nowISO },
    ],
  }
  await fetch(`https://terene-db-server.onrender.com/api/v2/refunds`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(refundPayload),
  })

  const templateCode = isCustomer ? "E" : "F"
  const paramsB = {
    stay_location: `${orderData.stay_location}`,
    reserver_name: orderData.stay_info?.name || orderData.reserver_name,
    order_id: orderData.order_id,
    membership_number: orderData.membership_number || "비회원 예약",
    reserver_contact: String(orderData.stay_info?.contact || orderData.reserver_contact),
    checkin_date: orderData.checkin_date,
    checkout_date: orderData.checkout_date,
    adult: String(orderData.stay_people?.adult),
    youth: String(orderData.stay_people?.teenager || "0"),
    child: String(orderData.stay_people?.child),
  }

  try {
    for (const p of adminPhones || []) {
      await fetch(`https://terene-notifier-server.onrender.com/api/kakao/v2`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiver_phone: String(p).replace(/-/g,""), template_type: templateCode, params: paramsB }),
      })
    }
  } catch {}
  try {
    for (const p of adminEmails || []) {
      await fetch(`https://terene-notifier-server.onrender.com/api/email/v2`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiver_email: p, platform: "gmail", template_type: templateCode, params: paramsB }),
      })
    }
  } catch {}

  await fetch(`https://terene-notifier-server.onrender.com/api/kakao/v2`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ receiver_phone: String(orderData.reserver_contact).replace(/-/g,""), template_type: templateCode, params: paramsB }),
  })
  await fetch(`https://terene-notifier-server.onrender.com/api/email/v2`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ receiver_email: orderData.reserver_email, template_type: templateCode, platform: "gmail", params: paramsB }),
  })
  if (!orderData.stay_info?.same_as_reserver && orderData.stay_info?.contact) {
    await fetch(`https://terene-notifier-server.onrender.com/api/kakao/v2`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receiver_phone: String(orderData.stay_info.contact).replace(/-/g,""), template_type: templateCode, params: paramsB }),
    })
  }
}

async function processJobJK(payload) {
  const { orderId, type, settlementInfo, settlement_url } = payload
  const now = kst()
  const nowISO = kstISO(new Date())

  const dateStr = now.toISOString().slice(2, 10).replace(/-/g, "")
  const timeStr = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`
  const settlementId = `S-${dateStr}-${timeStr}-${rid(6)}`
  const paymentId = `P-${dateStr}-${timeStr}-${rid(6)}`

  const orderRes = await fetch(`https://terene-db-server.onrender.com/api/v2/orders/${orderId}`)
  if (!orderRes.ok) throw new Error("order fetch failed")
  const orderData = await orderRes.json()

  const originalPaymentRes = await fetch(`https://terene-db-server.onrender.com/api/v2/payments`)
  const allPayments = await originalPaymentRes.json()
  const originalPayment = allPayments.find((p) => p.order_id === orderId && p.payment_type === "order")
  if (!originalPayment) throw new Error("original payment not found")

  const { additional_price, settlement_amount, settlement_breakdown } = settlementInfo

  const settlementPayload = type === "refund"
    ? { settlement_id: settlementId, settlement_type: "deposit_refund", order_id: orderId, additional_price, settlement_amount, settlement_breakdown,
        settlement_status: "pending", settlement_url: null,
        settlement_history: [{status:"pending",timestamp:nowISO},{status:"processing",timestamp:null},{status:"completed",timestamp:null}] }
    : { settlement_id: settlementId, settlement_type: "additional_payment", order_id: orderId, additional_price, settlement_amount, settlement_breakdown,
        settlement_status: "pending", settlement_url: settlement_url || null,
        settlement_history: [{status:"pending",timestamp:nowISO},{status:"processing",timestamp:null},{status:"completed",timestamp:null}] }

  const sRes = await fetch(`https://terene-db-server.onrender.com/api/v2/settlements`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settlementPayload),
  })
  if (!sRes.ok) throw new Error("settlement create failed")

  const paymentPayload = type === "refund"
    ? { payment_id: paymentId, payment_type: "settlement", order_id: orderId,
        payment_info: originalPayment.payment_info, payment_method: "Toss Payments Refund",
        payment_account: originalPayment.receiver_account, receiver_account: originalPayment.payment_account,
        payment_due: kstISO(new Date(now.getTime() + 24 * 3600000)),
        price_paid: settlement_amount, payment_status: "pending",
        payment_history: [{status:"pending",timestamp:nowISO},{status:"processing",timestamp:null},{status:"completed",timestamp:null}] }
    : { payment_id: paymentId, payment_type: "settlement", order_id: orderId,
        payment_info: originalPayment.payment_info, payment_method: "Link Pay",
        payment_account: originalPayment.payment_account, receiver_account: originalPayment.receiver_account,
        payment_due: kstISO(new Date(now.getTime() + 24 * 3600000)),
        price_paid: settlement_amount, payment_status: "pending",
        payment_history: [{status:"pending",timestamp:nowISO},{status:"processing",timestamp:null},{status:"completed",timestamp:null}] }

  const pRes = await fetch(`https://terene-db-server.onrender.com/api/v2/payments`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(paymentPayload),
  })
  if (!pRes.ok) throw new Error("settlement payment create failed")

  const templateCode = type === "refund" ? "J" : "K"
  const params = {
    stay_location: `${orderData.stay_location}`,
    reserver_name: orderData.reserver_name,
    order_id: orderData.order_id,
    deposit_price: Number(orderData.deposit_price ?? "0").toLocaleString(),
    additional_price: Number(additional_price ?? "0").toLocaleString(),
    settlement_breakdown: String(settlement_breakdown ?? ""),
    settlement_amount: Number(settlement_amount ?? "0").toLocaleString(),
    ...(type === "additional" && settlement_url ? { settlement_url } : {}),
  }

  await fetch(`https://terene-notifier-server.onrender.com/api/kakao/v2`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ receiver_phone: String(orderData.reserver_contact).replace(/-/g,""), template_type: templateCode, params }),
  })
  await fetch(`https://terene-notifier-server.onrender.com/api/email/v2`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ receiver_email: orderData.reserver_email, template_type: templateCode, platform: "gmail", params }),
  })
}

async function processJobL(payload) {
  const { orderId, type, settlementInfo } = payload
  const { adminPhones, adminEmails } = await fetchAdminContacts()

  const now = kst()
  const nowISO = kstISO(new Date())

  const orderRes = await fetch(`https://terene-db-server.onrender.com/api/v2/orders/${orderId}`)
  if (!orderRes.ok) throw new Error("order fetch failed")
  const orderData = await orderRes.json()

  if (type === "refund" || type === "additional") {
    const paymentsRes = await fetch(`https://terene-db-server.onrender.com/api/v2/payments`)
    const settlementsRes = await fetch(`https://terene-db-server.onrender.com/api/v2/settlements`)
    const [payments, settlements] = await Promise.all([paymentsRes.json(), settlementsRes.json()])

    const targetPayment = payments.find((p) => p.order_id === orderId && p.payment_type === "settlement")
    const targetSettlement = settlements.find((s) => s.order_id === orderId && s.settlement_type === (type === "refund" ? "deposit_refund" : "additional_payment"))
    if (!targetPayment || !targetSettlement) throw new Error("settlement or payment not found")

    const updatedPayment = {
      ...targetPayment,
      payment_status: "completed",
      payment_history: [
        { status: "pending", timestamp: targetPayment.payment_history?.find((h)=>h.status==="pending")?.timestamp || nowISO },
        { status: "processing", timestamp: nowISO },
        { status: "completed", timestamp: nowISO },
      ],
    }
    const updatedSettlement = {
      ...targetSettlement,
      settlement_status: "completed",
      settlement_history: [
        { status: "pending", timestamp: targetSettlement.settlement_history?.find((h)=>h.status==="pending")?.timestamp || nowISO },
        { status: "processing", timestamp: nowISO },
        { status: "completed", timestamp: nowISO },
      ],
    }

    await fetch(`https://terene-db-server.onrender.com/api/v2/payments/${updatedPayment.payment_id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updatedPayment),
    })
    await fetch(`https://terene-db-server.onrender.com/api/v2/settlements/${updatedSettlement.settlement_id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updatedSettlement),
    })
  } else if (type === "complete") {
    if (!settlementInfo) throw new Error("settlementInfo required")
    const { additional_price, settlement_breakdown } = settlementInfo
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, "")
    const timeStr = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`
    const settlementId = `S-${dateStr}-${timeStr}-${rid(6)}`
    const settlementPayload = {
      settlement_id: settlementId,
      settlement_type: "others",
      order_id: orderId,
      additional_price,
      settlement_amount: 0,
      settlement_breakdown,
      settlement_status: "completed",
      settlement_url: null,
      settlement_history: [
        { status: "pending", timestamp: nowISO },
        { status: "processing", timestamp: nowISO },
        { status: "completed", timestamp: nowISO },
      ],
    }
    const sRes = await fetch(`https://terene-db-server.onrender.com/api/v2/settlements`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settlementPayload),
    })
    if (!sRes.ok) throw new Error("settlement create failed")
  }

  const params = {
    stay_location: `${orderData.stay_location}`,
    reserver_name: orderData.stay_info?.name || orderData.reserver_name,
    order_id: orderData.order_id,
  }
  
  try {
    for (const p of adminPhones || []) {
      await fetch(`https://terene-notifier-server.onrender.com/api/kakao/v2`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiver_phone: String(p).replace(/-/g,""), template_type: "L", params }),
      })
    }
  } catch {}

  try {
    for (const e of adminEmails || []) {
      await fetch(`https://terene-notifier-server.onrender.com/api/email/v2`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiver_email: e, template_type: "L", platform: "gmail", params }),
      })
    }
  } catch {}

  // await fetch(`https://terene-notifier-server.onrender.com/api/kakao/v2`, {
  //   method: "POST", headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({ receiver_phone: String(orderData.reserver_contact).replace(/-/g,""), template_type: "L", params }),
  // })
}

async function processJobN(payload) {
  const orderRes = await fetch("https://terene-db-server.onrender.com/api/v2/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload.orderPayload),
  })
  if (!orderRes.ok) throw new Error(await orderRes.text())

  // const created = await orderRes.json()

  const orderData = payload.orderPayload

  // try {
  //   for (const p of payload.notify?.adminPhones || []) {
  //     await fetch("https://terene-notifier-server.onrender.com/api/kakao/v2", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         receiver_phone: String(p).replace(/-/g, ""),
  //         template_type: "N",
  //         params: payload.templateParams,
  //       }),
  //     })
  //   }
  // } catch {}

  try {
    await fetch("https://terene-notifier-server.onrender.com/api/kakao/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        receiver_phone: String(orderData.reserver_contact).replace(/-/g, ""),
        template_type: "N",
        params: payload.templateParams,
      }),
    })
  } catch {}

  try {
    await fetch("https://terene-notifier-server.onrender.com/api/email/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        receiver_email: orderData.reserver_email,
        template_type: "N",
        platform: "gmail",
        params: payload.templateParams,
      }),
    })
  } catch {}

  try {
    await updateDaysOccupancy(orderData, true)
  } catch {}
}

async function processJobO(payload) {
  const phone = String(payload.contact).replace(/-/g, "")
  await fetch("https://terene-notifier-server.onrender.com/api/kakao/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      receiver_phone: phone,
      template_type: "O",
      params: { name: payload.templateParams.name },
    }),
  })
}

async function loop() {
  while (true) {
    const item = await take()
    try {
      const k = item?.payload?.kind
      if (k === "A") await processJobA(item.payload)
      else if (k === "CD") await processJobCD(item.payload)
      else if (k === "EF") await processJobEF(item.payload)
      else if (k === "JK") await processJobJK(item.payload)
      else if (k === "L") await processJobL(item.payload)
      else if (k === "N") await processJobN(item.payload)
      else if (k === "O") await processJobO(item.payload)
    } catch {}
  }
}

function start() { loop() }
module.exports = { start }

// queue/reservationWorker.js
const { take } = require("./reservationQueue")

function kst(d = new Date()) {
  const t = d.getTime() + d.getTimezoneOffset() * 60000 + 9 * 3600000
  return new Date(t)
}
function kstISO(d = new Date()) {
  const x = kst(d)
  const z = (n) => String(n).padStart(2, "0")
  return `${x.getFullYear()}-${z(x.getMonth() + 1)}-${z(x.getDate())}T${z(x.getHours())}:${z(x.getMinutes())}:${z(x.getSeconds())}+09:00`
}
function rid(n = 6) {
  const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let s = ""
  for (let i = 0; i < n; i++) s += c[Math.floor(Math.random() * c.length)]
  return s
}

async function processJobA(payload) {
  const { orderId, amount, paymentKey, isFree, templateParams, templateParamsB, notify } = payload
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
    const allDaysRes = await fetch(`https://terene-db-server.onrender.com/api/days`)
    if (!allDaysRes.ok) throw new Error(`days fetch failed`)
    const allDays = await allDaysRes.json()
    const dateRange = []
    let cur = new Date(orderData.checkin_date)
    const end = new Date(orderData.checkout_date)
    while (cur <= end) {
      dateRange.push(cur.toISOString().split("T")[0])
      cur.setDate(cur.getDate() + 1)
    }
    const targetDays = allDays.filter((d) => dateRange.includes(d.date))
    for (const day of targetDays) {
      const updatedDay = { ...day }
      if (day.date === orderData.checkin_date) {
        updatedDay.checkin = { is_occupied: true, occupied_order_id: orderId }
      } else if (day.date === orderData.checkout_date) {
        updatedDay.checkout = { is_occupied: true, occupied_order_id: orderId }
      } else {
        updatedDay.checkin = { is_occupied: true, occupied_order_id: orderId }
        updatedDay.checkout = { is_occupied: true, occupied_order_id: orderId }
      }
      const r = await fetch(`https://terene-db-server.onrender.com/api/days/${day.date}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedDay),
      })
      if (!r.ok) throw new Error(`occupancy update failed: ${day.date}`)
    }
  } catch (e) {}

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
    for (const p of notify.adminPhones || []) {
      await fetch("https://terene-notifier-server.onrender.com/api/kakao/v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiver_phone: String(p).replace(/-/g, ""), template_type: "A", params: templateParams }),
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

async function processJobN(job) {
  const nowISO = kstISO()
  const orderRes = await fetch("https://terene-db-server.onrender.com/api/v2/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(job.orderPayload),
  })
  if (!orderRes.ok) throw new Error(await orderRes.text())
  const created = await orderRes.json()

  const updated = {
    ...created,
    reservation_status: "confirmed",
    reservation_history: (created.reservation_history || []).map((e) =>
      e.status === "confirmed" ? { status: "confirmed", timestamp: nowISO } : e
    ),
  }
  const putRes = await fetch(`https://terene-db-server.onrender.com/api/v2/orders/${created.order_id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updated),
  })
  if (!putRes.ok) throw new Error(await putRes.text())

  try {
    const allDaysRes = await fetch(`https://terene-db-server.onrender.com/api/days`)
    if (!allDaysRes.ok) throw new Error(`days fetch failed`)
    const allDays = await allDaysRes.json()
    const dateRange = []
    let cur = new Date(updated.checkin_date)
    const end = new Date(updated.checkout_date)
    while (cur <= end) {
      dateRange.push(cur.toISOString().split("T")[0])
      cur.setDate(cur.getDate() + 1)
    }
    const targetDays = allDays.filter((d) => dateRange.includes(d.date))
    for (const day of targetDays) {
      const x = { ...day }
      if (day.date === updated.checkin_date) {
        x.checkin = { is_occupied: true, occupied_order_id: updated.order_id }
      } else if (day.date === updated.checkout_date) {
        x.checkout = { is_occupied: true, occupied_order_id: updated.order_id }
      } else {
        x.checkin = { is_occupied: true, occupied_order_id: updated.order_id }
        x.checkout = { is_occupied: true, occupied_order_id: updated.order_id }
      }
      const r = await fetch(`https://terene-db-server.onrender.com/api/days/${day.date}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(x),
      })
      if (!r.ok) throw new Error(`occupancy update failed: ${day.date}`)
    }
  } catch {}

  try {
    for (const p of job.notify?.adminPhones || []) {
      await fetch("https://terene-notifier-server.onrender.com/api/kakao/v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiver_phone: String(p).replace(/-/g, ""),
          template_type: "N",
          params: job.templateParams,
        }),
      })
    }
  } catch {}

  try {
    await fetch("https://terene-notifier-server.onrender.com/api/kakao/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        receiver_phone: String(updated.reserver_contact).replace(/-/g, ""),
        template_type: "N",
        params: job.templateParams,
      }),
    })
  } catch {}
}

async function loop() {
  while (true) {
    const item = await take()
    try {
      if (item?.job?.kind === "N") {
        await processJobN(item.job)
      } else if (item?.job?.kind === "A") {
        await processJobA(item.job)
      } else {
        await processJobA(item.job)
      }
    } catch {}
  }
}

function start() {
  loop()
}

module.exports = { start }

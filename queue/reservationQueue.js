const express = require("express")
const { EventEmitter } = require("events")

const router = express.Router()
const bus = new EventEmitter()
const q = []

function enqueue(job) {
  const id = `job_${Date.now()}_${Math.random().toString(36).slice(2)}`
  q.push({ id, job, enqueuedAt: Date.now() })
  bus.emit("added")
  return id
}

router.post("/reservation", async (req, res) => {
  try {
    const {
      orderId,
      amount,
      paymentKey,
      isFree,
      templateParams,
      templateParamsB,
      notify,
    } = req.body
    if (!orderId) return res.status(400).json({ error: "orderId required" })
    const id = enqueue({
      orderId,
      amount,
      paymentKey: isFree ? null : paymentKey,
      isFree: !!isFree,
      templateParams: templateParams || {},
      templateParamsB: templateParamsB || {},
      notify: notify || { adminPhones: [], adminEmails: [] },
    })
    res.json({ ok: true, jobId: id })
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) })
  }
})

async function take() {
  while (q.length === 0) {
    await new Promise((r) => bus.once("added", r))
  }
  return q.shift()
}

module.exports = { router, take }

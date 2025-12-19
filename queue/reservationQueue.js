// queue/reservationQueue.js
const express = require("express")
const { EventEmitter } = require("events")

const router = express.Router()
const bus = new EventEmitter()
const q = []

function enqueue(payload) {
  const id = `job_${Date.now()}_${Math.random().toString(36).slice(2)}`
  q.push({ id, payload, enqueuedAt: Date.now() })
  bus.emit("added")
  return id
}

router.post("/A", async (req, res) => {
  try {
    const { orderId, amount, paymentKey, isFree, isAdminBypass, templateParams, templateParamsB, notify } = req.body
    if (!orderId) return res.status(400).json({ error: "orderId required" })
    const id = enqueue({
      kind: "A",
      orderId,
      amount,
      paymentKey: isFree ? null : isAdminBypass ? null : paymentKey,
      isFree: !!isFree,
      isAdminBypass: !!isAdminBypass,
      templateParams: templateParams || {},
      templateParamsB: templateParamsB || {},
    })
    res.json({ ok: true, jobId: id })
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) })
  }
})

router.post("/CD", async (req, res) => {
  try {
    const { orderId, actor, cancelMode } = req.body
    if (!orderId) return res.status(400).json({ error: "orderId required" })
    if (!["admin","customer"].includes(actor)) return res.status(400).json({ error: "actor invalid" })
    if (!["decline","cancel"].includes(cancelMode)) return res.status(400).json({ error: "cancelMode invalid" })
    const id = enqueue({ kind: "CD", orderId, actor, cancelMode })
    res.json({ ok: true, jobId: id })
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) })
  }
})

router.post("/EF", async (req, res) => {
  try {
    const { orderId } = req.body
    if (!orderId) return res.status(400).json({ error: "orderId required" })
    const id = enqueue({ kind: "EF", orderId })
    res.json({ ok: true, jobId: id })
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) })
  }
})

router.post("/JK", async (req, res) => {
  try {
    const { orderId, type, settlementInfo, settlement_url } = req.body
    if (!orderId) return res.status(400).json({ error: "orderId required" })
    if (!["refund","additional"].includes(type)) return res.status(400).json({ error: "type invalid" })
    const id = enqueue({ kind: "JK", orderId, type, settlementInfo, settlement_url: settlement_url || null })
    res.json({ ok: true, jobId: id })
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) })
  }
})

router.post("/L", async (req, res) => {
  try {
    const { orderId, type, settlementInfo } = req.body
    if (!orderId) return res.status(400).json({ error: "orderId required" })
    if (!["refund","additional","complete"].includes(type)) return res.status(400).json({ error: "type invalid" })
    const id = enqueue({ kind: "L", orderId, type, settlementInfo: settlementInfo || null })
    res.json({ ok: true, jobId: id })
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) })
  }
})

router.post("/N", async (req, res) => {
  try {
    const { orderPayload, templateParams, notify } = req.body
    if (!orderPayload?.order_id) return res.status(400).json({ error: "orderPayload.order_id required" })
    const id = enqueue({
      kind: "N",
      orderPayload,
      templateParams: templateParams || {},
    })
    res.json({ ok: true, jobId: id })
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) })
  }
})

router.post("/O", async (req, res) => {
  try {
    const { contact, templateParams } = req.body
    if (!contact) return res.status(400).json({ error: "contact required" })
    if (!templateParams?.name) return res.status(400).json({ error: "templateParams.name required" })
    const id = enqueue({
      kind: "O",
      contact,
      templateParams: { name: String(templateParams.name) },
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

// cron/updater.js
const cron = require('node-cron');
const axios = require('axios');
require('dotenv').config();

const DB_BASE_URL = process.env.DB_BASE_URL || 'https://terene-db-server.onrender.com';
const CONCURRENCY = 10; // 동시 PUT 개수

// 필요 시 인증 헤더 사용 (.env에 API_KEY 설정 시)
const axiosInstance = axios.create({
  baseURL: DB_BASE_URL,
  timeout: 15000,
  headers: process.env.API_KEY ? { Authorization: `Bearer ${process.env.API_KEY}` } : undefined,
});

/** 현재 시각(KST) Date 객체 */
function nowKST() {
  const now = new Date();
  return new Date(now.getTime() + 9 * 60 * 60 * 1000);
}

/**
 * 타임존 표기 없는 문자열(예: "2026-07-31 00:00:00")이면 +09:00 붙여 KST로 파싱
 * 이미 Z 또는 ±HH:MM 붙어 있으면 그대로 파싱
 */
function parseAsKST(dateStr) {
  if (!dateStr) return null;
  const normalized = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
  const hasTZ = /Z$|([+-]\d{2}:\d{2})$/.test(normalized);
  const iso = hasTZ ? normalized : `${normalized}+09:00`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

async function fetchAllCouponInstances() {
  const { data } = await axiosInstance.get('/api/v2/coupon-instances');
  return Array.isArray(data) ? data : [];
}

async function putExpired(coupon) {
  const id = coupon.coupon_instance_id || coupon.id;
  if (!id) {
    console.warn('⚠️ [Updater] coupon_instance_id 누락으로 스킵:', coupon);
    return;
  }

  const url = `/api/v2/coupon-instances/${encodeURIComponent(id)}`;
  const payload = { ...coupon, status: 'expired' }; // 컨트롤러 upsert 패턴에 맞춤

  console.log('➡️  [Updater] PUT 시작:', id);
  try {
    await axiosInstance.put(url, payload);
    console.log('✅ [Updater] 만료 처리 완료:', id);
  } catch (err) {
    console.error('❌ [Updater] PUT 실패:', id, err.response?.status, err.response?.data || err.message);
    throw err;
  }
}

/** 간단한 동시성 제한 실행기 */
async function withConcurrency(list, limit, worker) {
  const queue = list.slice();
  const size = Math.min(limit, list.length) || 1;
  const runners = Array.from({ length: size }, async () => {
    while (queue.length) {
      const item = queue.shift();
      try {
        await worker(item);
      } catch (err) {
        const id = item?.coupon_instance_id || item?.id || '(unknown)';
        console.error(`❌ [Updater] 처리 실패: ${id}`, err.response?.status, err.response?.data || err.message);
      }
    }
  });
  await Promise.all(runners);
}

function startUpdaterJobs() {
  // 5분마다 실행
  cron.schedule(
    '*/5 * * * *',
    async () => {
      const tick = new Date().toISOString();
      console.log(`🔄 [Updater] 쿠폰 만료 점검 시작 @ ${tick}`);

      try {
        const coupons = await fetchAllCouponInstances();
        const now = nowKST();

        // 대상: coupon_due 존재, now(KST)보다 과거 또는 동일 && 이미 expired 아닌 것
        const targets = coupons.filter((c) => {
          if (c?.status === 'expired') return false;
          if (!c?.coupon_due) return false;
          const due = parseAsKST(c.coupon_due);
          if (!due) return false;
          return due.getTime() <= now.getTime();
        });

        console.log(`📦 [Updater] 전체 ${coupons.length}건 중 만료 대상 ${targets.length}건`);
        await withConcurrency(targets, CONCURRENCY, putExpired);

        console.log('🏁 [Updater] 쿠폰 만료 점검 완료');
      } catch (err) {
        console.error('❌ [Updater] 전체 작업 오류:', err.response?.data || err.message);
      }
    },
    { timezone: 'Asia/Seoul' }
  );
}

module.exports = startUpdaterJobs;

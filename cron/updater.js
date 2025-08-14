// cron/updater.js
const cron = require('node-cron');
const axios = require('axios');
require('dotenv').config();

const DB_BASE_URL = 'https://terene-db-server.onrender.com';
const CONCURRENCY = Number(10);  // 병렬 수행 기준
const DRY_RUN = 'false';  // true: 실제로 업데이트하지 않고 로그만 출력, false: 실제로 업데이트 수행

// API 인증이 필요하면 .env에 API_KEY를 넣고 헤더로 전달 (없으면 무시)
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
 * 타임존 표기가 없는 문자열(예: "2026-07-31 00:00:00")이면 +09:00을 붙여 KST로 파싱
 * 이미 Z 또는 ±HH:MM이 붙어 있으면 그대로 파싱
 */
function parseAsKST(dateStr) {
  if (!dateStr) return null;
  // 공백 구분 형식도 ISO로 안전하게 바꿔주기
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
  // 컨트롤러가 upsert 형태이므로 전체 객체에 status만 변경해서 보냅니다.
  const id = coupon.coupon_instance_id || coupon.id;
  if (!id) {
    console.warn('⚠️ [Updater] coupon_instance_id 누락으로 스킵:', coupon);
    return;
  }

  const payload = { ...coupon, status: 'expired' };

  if (DRY_RUN) {
    console.log('🧪 [DRY_RUN] 만료 예정 →', id, coupon.coupon_due);
    return;
  }

  await axiosInstance.put(`/api/v2/coupon-instances/${encodeURIComponent(id)}`, payload);
  console.log('✅ [Updater] 만료 처리 완료:', id);
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
        console.error(`❌ [Updater] 실패: ${id} →`, err.response?.data || err.message);
      }
    }
  });
  await Promise.all(runners);
}

function startUpdaterJobs() {
  cron.schedule(
    '0,10,20,30,40,50 * * * *',
    async () => {
      const tick = new Date().toISOString();
      console.log(`🔄 [Updater] 쿠폰 만료 점검 시작 @ ${tick}`);

      try {
        const coupons = await fetchAllCouponInstances();
        const now = nowKST();

        // 대상: coupon_due 존재 & now(KST)보다 과거 & (이미 expired는 제외)
        const targets = coupons.filter((c) => {
          if (c?.status === 'expired') return false;
          if (!c?.coupon_due) return false;

          const due = parseAsKST(c.coupon_due);
          if (!due) return false;

          return due.getTime() < now.getTime();
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

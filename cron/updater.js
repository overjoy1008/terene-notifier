// cron/updater.js
const cron = require('node-cron');
const axios = require('axios');
require('dotenv').config();

const DB_BASE_URL = process.env.DB_BASE_URL || 'https://terene-db-server.onrender.com';
const CONCURRENCY = 10; // 동시 PUT/POST 개수

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

/** 오늘 자정(KST) Date 객체 */
function startOfTodayKST() {
  const kst = nowKST();
  return new Date(Date.UTC(
    kst.getUTCFullYear(),
    kst.getUTCMonth(),
    kst.getUTCDate(),
    -9, 0, 0, 0 // UTC 기준으로 -9h = KST 자정
  ));
}

/** Date → 'YYYY-MM-DDTHH:mm:ss+09:00' (KST 고정) */
function toKSTISO(dateObj) {
  const kstMs = dateObj.getTime(); // 내부 UTC ms
  const y = dateObj.getUTCFullYear();
  const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getUTCDate()).padStart(2, '0');
  const hh = String(dateObj.getUTCHours()).padStart(2, '0');
  const mm = String(dateObj.getUTCMinutes()).padStart(2, '0');
  const ss = String(dateObj.getUTCSeconds()).padStart(2, '0');

  // dateObj가 이미 KST 자정 등으로 맞춰져 있게 만들었으므로 +09:00을 명시만 합니다.
  return `${y}-${m}-${d}T${hh}:${mm}:${ss}+09:00`;
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
    return false;
  }

  const url = `/api/v2/coupon-instances/${encodeURIComponent(id)}`;
  const payload = { ...coupon, status: 'expired' }; // 컨트롤러 upsert 패턴에 맞춤

  console.log('➡️  [Updater] PUT(만료) 시작:', id);
  try {
    await axiosInstance.put(url, payload);
    console.log('✅ [Updater] 만료 처리 완료:', id);
    return true;
  } catch (err) {
    console.error('❌ [Updater] PUT 실패:', id, err.response?.status, err.response?.data || err.message);
    return false;
  }
}

/** 랜덤 문자열 생성 (alphabet에서만) */
function randomString(len, alphabet) {
  let out = '';
  const n = alphabet.length;
  for (let i = 0; i < len; i++) {
    out += alphabet[Math.floor(Math.random() * n)];
  }
  return out;
}

/** 8~10 중 임의 길이 */
function randomLength8to10() {
  const lens = [8, 9, 10];
  return lens[Math.floor(Math.random() * lens.length)];
}

/** 새 coupon_instance_id 생성: CI-YYMMDD-HHMM-XXXXXXXX */
function generateNewInstanceIdKST() {
  const kst = nowKST();
  const yy = String(kst.getUTCFullYear()).slice(-2);
  const mm = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(kst.getUTCDate()).padStart(2, '0');
  const HH = String(kst.getUTCHours()).padStart(2, '0');
  const MM = String(kst.getUTCMinutes()).padStart(2, '0');

  const rand = randomString(8, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789');
  return `CI-${yy}${mm}${dd}-${HH}${MM}-${rand}`;
}

/** 새 coupon_code 생성: 8~10, (l, I, O, 0) 제외 */
function generateNewCouponCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789'; // I,O,l,0 제외
  return randomString(randomLength8to10(), alphabet);
}

/** 생성 요청 전에 복제 원본의 위험 필드 제거 */
function sanitizeForCreate(obj) {
  const copy = { ...obj };
  delete copy.id;
  delete copy._id;
  delete copy.created_at;
  delete copy.updated_at;
  // 기존 PK가 coupon_instance_id라면 새 값으로 덮어쓸 것이므로 여기선 지워도 무방
  // (아래에서 새 값을 넣습니다)
  delete copy.coupon_instance_id;
  delete copy.status;       // 새 상태로 강제
  delete copy.issued_at;    // 새 발급일로 강제
  delete copy.coupon_due;   // 새 만료일로 강제
  // coupon_code는 조건에 따라 null 또는 새 랜덤이므로 아래에서 설정
  return copy;
}

/** issued_at(KST 자정)과 coupon_due(issued_at +1년 -1일) 계산 */
function computeIssuedAtAndDue() {
  const issuedAt = startOfTodayKST(); // KST 자정
  // +1년 -1일
  const plusOneYear = new Date(issuedAt.getTime());
  plusOneYear.setUTCFullYear(plusOneYear.getUTCFullYear() + 1);
  const dueMs = plusOneYear.getTime() - 24 * 60 * 60 * 1000;
  const due = new Date(dueMs);

  return {
    issued_at: toKSTISO(issuedAt),
    coupon_due: toKSTISO(due),
  };
}

async function postNewFromExpired(original) {
  const base = sanitizeForCreate(original);
  const newId = generateNewInstanceIdKST();
  const { issued_at, coupon_due } = computeIssuedAtAndDue();

  // coupon_code 규칙: 원본이 null -> null, 존재 -> 새 랜덤(8~10, l/I/O/0 제외)
  const newCouponCode = original.coupon_code == null ? null : generateNewCouponCode();

  const payload = {
    ...base,
    coupon_instance_id: newId,
    coupon_code: newCouponCode,
    status: 'available',
    issued_at,
    coupon_due,
  };

  console.log('🆕 [Updater] POST(새 쿠폰) 시작:', newId);
  try {
    const { data } = await axiosInstance.post('/api/v2/coupon-instances', payload);
    console.log('✅ [Updater] 새 쿠폰 생성 완료:', newId);
    return data;
  } catch (err) {
    console.error('❌ [Updater] POST 실패:', newId, err.response?.status, err.response?.data || err.message);
    throw err;
  }
}

/** 만료 후 복제 생성을 한 번에 처리 */
async function expireAndClone(coupon) {
  const id = coupon?.coupon_instance_id || coupon?.id || '(unknown)';
  const expiredOk = await putExpired(coupon);
  if (!expiredOk) {
    console.error('⛔ [Updater] 만료 실패로 복제 생성을 스킵:', id);
    return;
  }
  try {
    await postNewFromExpired(coupon);
  } catch (err) {
    console.error('⛔ [Updater] 복제 생성 실패:', id, err.response?.status, err.response?.data || err.message);
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
        // 변경: 만료 후 복제 생성까지 처리
        await withConcurrency(targets, CONCURRENCY, expireAndClone);

        console.log('🏁 [Updater] 쿠폰 만료 점검 + 복제 생성 완료');
      } catch (err) {
        console.error('❌ [Updater] 전체 작업 오류:', err.response?.data || err.message);
      }
    },
    { timezone: 'Asia/Seoul' }
  );
}

module.exports = startUpdaterJobs;

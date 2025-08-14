// cron/updater.js
const cron = require('node-cron');
const axios = require('axios');
const crypto = require('crypto');
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

/** 'YYYY-MM-DD' (KST 날짜) */
function todayKSTDateOnly() {
  const kst = nowKST();
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(kst.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** KST 시각 HH:mm:ss (문자열) */
function nowKSTTimeHMS() {
  const kst = nowKST();
  const hh = String(kst.getUTCFullHours?.() ?? kst.getUTCHours()).padStart(2, '0');
  const mm = String(kst.getUTCMinutes()).padStart(2, '0');
  const ss = String(kst.getUTCSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
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

/** UTC(Z) 문자열 포맷터: 'YYYY-MM-DDTHH:mm:ssZ' */
function toUTCISO(dateObj) {
  const y = dateObj.getUTCFullYear();
  const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getUTCDate()).padStart(2, '0');
  const hh = String(dateObj.getUTCHours()).padStart(2, '0');
  const mm = String(dateObj.getUTCMinutes()).padStart(2, '0');
  const ss = String(dateObj.getUTCSeconds()).padStart(2, '0');
  return `${y}-${m}-${d}T${hh}:${mm}:${ss}Z`;
}

/**
 * "KST 벽시각(Date)" → "DB가 timestamp로 받더라도 KST 자정이 그대로 저장되도록"
 * 저장 시에는 KST 기준 시간을 +9시간 시프트한 뒤 Z(UTC)로 직렬화
 * 예) 2025-08-14 00:00:00 KST (내부 2025-08-13T15:00:00Z) -> +9h -> '2025-08-14T00:00:00Z'
 */
function kstDateToUTCStorageISO(dateKST) {
  const shifted = new Date(dateKST.getTime() + 9 * 60 * 60 * 1000); // +9h
  return toUTCISO(shifted);
}

/** 오늘 KST 자정(issued_at)과 만료일(coupon_due=issued_at +1y -1d)을 DB 저장용(Z) ISO로 반환 */
function computeIssuedAtAndDueForStorage() {
  // 오늘 KST 자정 만들기
  const ymd = todayKSTDateOnly(); // 'YYYY-MM-DD'
  const issuedAtKST = new Date(`${ymd}T00:00:00+09:00`);

  // +1년 -1일 (KST 기준)
  const dueKST = new Date(issuedAtKST.getTime());
  dueKST.setUTCFullYear(dueKST.getUTCFullYear() + 1);
  const oneDayMs = 24 * 60 * 60 * 1000;
  dueKST.setTime(dueKST.getTime() - oneDayMs);

  return {
    issued_at: kstDateToUTCStorageISO(issuedAtKST), // 예: 'YYYY-MM-DDT00:00:00Z'
    coupon_due: kstDateToUTCStorageISO(dueKST),
  };
}

/** 랜덤 문자열 생성 (alphabet에서만) */
function randomString(len, alphabet) {
  let out = '';
  const n = alphabet.length;
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * n)];
  return out;
}

/** 8~10 중 임의 길이 */
function randomLength8to10() {
  const lens = [8, 9, 10];
  return lens[Math.floor(Math.random() * lens.length)];
}

/** 새 coupon_code 생성: 8~10, (l, I, O, 0) 제외 */
function generateNewCouponCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789'; // I,O,l,0 제외
  return randomString(randomLength8to10(), alphabet);
}

/** base64url 해시 → 영숫자만 남겨 필요한 길이만큼 슬라이스 */
function hashAlphaNum(seed, len) {
  let s = crypto.createHash('sha256').update(seed).digest('base64url').replace(/[-_]/g, '');
  while (s.length < len) s += s; // 길이 보강
  return s.slice(0, len);
}

/**
 * 결정적 새 coupon_instance_id 생성:
 * 포맷: CI-YYMMDD-HHMM-XXXXXXXX
 * - 날짜/시각: "지금 KST" (요구사항 유지)
 * - 마지막 8자: (원본ID + issued_at) 기반 해시 → 동시 중복 재생성 완화
 */
function generateNewInstanceIdKST(original, issued_at_iso) {
  const kst = nowKST();
  const yy = String(kst.getUTCFullYear()).slice(-2);
  const mm = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(kst.getUTCDate()).padStart(2, '0');
  const HH = String(kst.getUTCHours()).padStart(2, '0');
  const MM = String(kst.getUTCMinutes()).padStart(2, '0');

  const baseId = original.coupon_instance_id || original.id || JSON.stringify(original);
  const rand = hashAlphaNum(`${baseId}|${issued_at_iso}`, 8);
  return `CI-${yy}${mm}${dd}-${HH}${MM}-${rand}`;
}

/** 생성 요청 전에 복제 원본의 위험 필드 제거 */
function sanitizeForCreate(obj) {
  const copy = { ...obj };
  delete copy.id;
  delete copy._id;
  delete copy.created_at;
  delete copy.updated_at;
  delete copy.coupon_instance_id;
  delete copy.status;
  delete copy.issued_at;
  delete copy.coupon_due;
  return copy;
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
  const payload = { ...coupon, status: 'expired' };

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

async function postNewFromExpired(original) {
  const base = sanitizeForCreate(original);
  const { issued_at, coupon_due } = computeIssuedAtAndDueForStorage();

  // coupon_code 규칙: 원본이 null -> null, 존재 -> 새 랜덤(8~10, l/I/O/0 제외)
  const newCouponCode = original.coupon_code == null ? null : generateNewCouponCode();

  // 결정적 ID + Idempotency-Key (서버가 지원하면 완벽)
  const newId = generateNewInstanceIdKST(original, issued_at);
  const idempotencyKey = `recreate:${(original.coupon_instance_id || original.id || 'na')}|${issued_at}`;

  const payload = {
    ...base,
    coupon_instance_id: newId,
    coupon_code: newCouponCode,
    status: 'available',
    issued_at,   // '...Z' (KST 자정을 +9h 시프트한 UTC 표현)
    coupon_due,  // '...Z'
  };

  console.log('🆕 [Updater] POST(새 쿠폰) 시작:', newId);
  try {
    const { data } = await axiosInstance.post(
      '/api/v2/coupon-instances',
      payload,
      { headers: { 'Idempotency-Key': idempotencyKey } }
    );
    console.log('✅ [Updater] 새 쿠폰 생성 완료:', newId);
    return data;
  } catch (err) {
    const code = err.response?.status;
    if (code === 409 || code === 412) {
      // 409 Conflict / 412 Precondition Failed 등 → 타 워커가 선점
      console.warn('ℹ️ [Updater] 이미 동일 새 쿠폰이 생성된 것으로 판단(무시):', newId);
      return null;
    }
    console.error('❌ [Updater] POST 실패:', newId, code, err.response?.data || err.message);
    throw err;
  }
}

/** 프로세스 내 중복 처리를 막기 위한 Set */
const processingSet = new Set();

/** 만료 후 복제 생성을 한 번에 처리 (동일 쿠폰 동시 진입 방지) */
async function expireAndClone(coupon) {
  const key = coupon?.coupon_instance_id || coupon?.id || JSON.stringify(coupon);
  if (processingSet.has(key)) {
    console.warn('⏳ [Updater] 이미 처리 중인 쿠폰으로 스킵:', key);
    return;
  }
  processingSet.add(key);
  try {
    const expiredOk = await putExpired(coupon);
    if (!expiredOk) {
      console.error('⛔ [Updater] 만료 실패로 복제 생성을 스킵:', key);
      return;
    }
    await postNewFromExpired(coupon);
  } finally {
    processingSet.delete(key);
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

/** 같은 프로세스에서 스케줄 중복 실행 방지 */
let isRunning = false;

function startUpdaterJobs() {
  // 5분마다 실행
  cron.schedule(
    '*/5 * * * *',
    async () => {
      if (isRunning) {
        console.warn('⏭️ [Updater] 이전 작업이 아직 실행 중이어서 이번 주기를 건너뜁니다.');
        return;
      }
      isRunning = true;

      const tick = `${todayKSTDateOnly()} ${nowKSTTimeHMS()}`;
      console.log(`🔄 [Updater] 쿠폰 만료 점검 시작 @ ${tick} KST`);

      try {
        const coupons = await fetchAllCouponInstances();
        const now = nowKST();

        // 대상: coupon_due 존재, now(KST)보다 과거 또는 동일 && 이미 expired 아닌 것
        const tmpTargets = coupons.filter((c) => {
          if (c?.status === 'expired') return false;
          if (!c?.coupon_due) return false;
          const due = parseAsKST(c.coupon_due);
          if (!due) return false;
          return due.getTime() <= now.getTime();
        });

        // 같은 쿠폰ID가 중복으로 들어오는 경우 1회만 처리
        const seen = new Set();
        const targets = tmpTargets.filter((c) => {
          const k = c?.coupon_instance_id || c?.id;
          if (!k) return false;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });

        console.log(`📦 [Updater] 전체 ${coupons.length}건 중 만료 대상 ${targets.length}건`);
        await withConcurrency(targets, CONCURRENCY, expireAndClone);

        console.log('🏁 [Updater] 쿠폰 만료 점검 + 복제 생성 완료');
      } catch (err) {
        console.error('❌ [Updater] 전체 작업 오류:', err.response?.data || err.message);
      } finally {
        isRunning = false;
      }
    },
    { timezone: 'Asia/Seoul' }
  );
}

module.exports = startUpdaterJobs;

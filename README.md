# CodiDash
CodiDash
```
import http from 'k6/http';
import { check, sleep, fail } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

// -------------------------------------------------------
// Custom Metrics
// -------------------------------------------------------
const tenorResponseTime = new Trend('tenor_response_time_ms', true);
const rateResponseTime  = new Trend('rate_response_time_ms',  true);
const tradeResponseTime = new Trend('trade_response_time_ms', true);
const authResponseTime  = new Trend('auth_response_time_ms',  true);
const tradeSuccessRate  = new Rate('trade_success_rate');
const authErrors        = new Counter('auth_errors');
const tenorErrors       = new Counter('tenor_errors');
const rateErrors        = new Counter('rate_errors');
const tradeErrors       = new Counter('trade_errors');

// -------------------------------------------------------
// Configuration
// -------------------------------------------------------
const ENV         = __ENV.FX_ENV          || 'ppe';
const JURISDICTION= __ENV.JURISDICTION    || 'ZA';
const BROKER      = __ENV.BROKER_CODE     || 'THUN';

const AUTH_BASE   = __ENV.AUTH_URL        ||
  'https://authorised-api.cib-fx-trading-qa.cib-fx.sdc-nonprod.caas.absa.co.za';

const API_BASE    = __ENV.API_URL         ||
  `https://fx-product-api.cib-fx-trade-${ENV}.cib-fx.nonprod.caas.absa.co.za`;

const TENOR_URL   = `${API_BASE}/api/tenors/soonest`;
const RATE_URL    = `${API_BASE}/api/rates/standard`;
const TRADE_URL   = `${API_BASE}/api/trades`;

// -------------------------------------------------------
// VU user pool — each VU gets its own user
// -------------------------------------------------------
const USERS = [
  'fxtrading-user1',
  'fxtrading-user2',
  'fxtrading-user3',
  'fxtrading-user4',
  'fxtrading-user5',
];

// Currency pairs to iterate over (mirrors CLIENT_PAIRS in Python)
const CURRENCY_PAIRS = [
  { base: 'USD', quote: 'ZAR', tenor: 'ON', side: 'Buy',  clientId: '729387147873296384' },
  { base: 'USD', quote: 'ZAR', tenor: 'TN', side: 'Buy',  clientId: '729387147873296384' },
  { base: 'EUR', quote: 'ZAR', tenor: 'SP', side: 'Sell', clientId: '729387147873296384' },
  { base: 'USD', quote: 'KES', tenor: 'ON', side: 'Buy',  clientId: '729387147873296386' },
  { base: 'USD', quote: 'BWP', tenor: 'SP', side: 'Buy',  clientId: '729387147873296387' },
];

// -------------------------------------------------------
// k6 options
// -------------------------------------------------------
export const options = {
  scenarios: {
    fx_trade_flow: {
      executor:    'per-vu-iterations',
      vus:         5,
      iterations:  CURRENCY_PAIRS.length,
      maxDuration: '10m',
    },
  },
  thresholds: {
    'auth_response_time_ms':  ['p(95)<3000'],
    'tenor_response_time_ms': ['p(95)<2000'],
    'rate_response_time_ms':  ['p(95)<2000'],
    'trade_response_time_ms': ['p(95)<3000'],
    'trade_success_rate':     ['rate>0.80'],
    'http_req_failed':        ['rate<0.05'],
  },
};

// -------------------------------------------------------
// Step 0 — Auth: GET bearer tokens, extract Product_Api
// GET /ppe/fxtrading-user{N}
// Response: { "Product_Api": "Bearer <token>", ... }
// -------------------------------------------------------
function getProductApiToken(userName) {
  const url = `${AUTH_BASE}/${ENV}/${userName}`;

  const start = Date.now();
  const res = http.get(url, {
    headers: { 'accept': 'application/json' },
    tags:    { name: 'auth_get_tokens' },
  });
  authResponseTime.add(Date.now() - start);

  const ok = check(res, {
    'auth: status 200':          (r) => r.status === 200,
    'auth: has Product_Api':     (r) => {
      try { return r.json('Product_Api') !== ''; }
      catch { return false; }
    },
  });

  if (!ok || res.status !== 200) {
    authErrors.add(1);
    console.error(`❌ Auth failed for ${userName}: HTTP ${res.status} — ${res.body}`);
    return null;
  }

  const tokens      = res.json();                  // full token map
  const productToken = tokens['Product_Api'];      // "Bearer <hex>"

  if (!productToken || productToken === '') {
    authErrors.add(1);
    console.error(`❌ Product_Api token is empty for ${userName}`);
    return null;
  }

  console.log(`🔑 Authenticated as ${userName} | Product_Api token acquired`);
  return productToken;   // already includes "Bearer " prefix
}

// -------------------------------------------------------
// Business-day helpers (mirrors Python add_business_days)
// -------------------------------------------------------
function addBusinessDays(date, numDays) {
  let current  = new Date(date);
  let added    = 0;
  while (added < numDays) {
    current.setDate(current.getDate() + 1);
    const dow = current.getDay();
    if (dow !== 0 && dow !== 6) added++;   // skip Sat(6) / Sun(0)
  }
  return current;
}

const TENOR_BDAYS = { ON: 0, TN: 1, SP: 2, SN: 3 };

function getExpectedValueDate(tenor) {
  const bdays = TENOR_BDAYS[tenor];
  if (bdays === undefined) return null;
  const today = new Date();
  const result = addBusinessDays(today, bdays);
  return result.toISOString().split('T')[0];   // "YYYY-MM-DD"
}

// -------------------------------------------------------
// Step 1 — Tenor API (mirrors get_tenor in Python)
// GET /api/tenors/soonest
// -------------------------------------------------------
function getSoonestTenor(token, pair) {
  const params = new URLSearchParams({
    BaseCurrency:  pair.base,
    QuoteCurrency: pair.quote,
    Tenor:         pair.tenor,
    Side:          pair.side,
    ClientId:      pair.clientId,
  });

  const start = Date.now();
  const res = http.get(`${TENOR_URL}?${params}`, {
    headers: {
      'accept':        'text/plain',
      'Fx-BrokerCode': BROKER,
      'Authorization': token,
    },
    tags: { name: 'tenor_soonest' },
  });
  tenorResponseTime.add(Date.now() - start);

  const ok = check(res, {
    'tenor: status 200':       (r) => r.status === 200,
    'tenor: has validTenor':   (r) => {
      try { return !!r.json('validTenor'); }
      catch { return false; }
    },
  });

  if (!ok) {
    tenorErrors.add(1);
    console.error(`❌ Tenor API failed: HTTP ${res.status} | ${pair.base}/${pair.quote}`);
    return null;
  }

  const data       = res.json();
  const validTenor = data.validTenor;
  const valueDate  = data.valueDate || data.validTenorDate || getExpectedValueDate(validTenor);

  console.log(`📅 Tenor: ${validTenor} | ValueDate: ${valueDate} | ${pair.base}/${pair.quote}`);
  return { validTenor, valueDate };
}

// -------------------------------------------------------
// Step 2 — Rate API (mirrors get_rate in Python)
// GET /api/rates/standard
// -------------------------------------------------------
function getRate(token, pair, validTenor) {
  const params = new URLSearchParams({
    BaseCurrency:  pair.base,
    QuoteCurrency: pair.quote,
    Tenor:         validTenor,
    Side:          pair.side,
    ClientId:      pair.clientId,
  });

  const start = Date.now();
  const res = http.get(`${RATE_URL}?${params}`, {
    headers: {
      'accept':        'text/plain',
      'Fx-BrokerCode': BROKER,
      'Authorization': token,
    },
    tags: { name: 'rate_standard' },
  });
  rateResponseTime.add(Date.now() - start);

  const ok = check(res, {
    'rate: status 200':    (r) => r.status === 200,
    'rate: has token':     (r) => {
      try { return !!r.json('token'); }
      catch { return false; }
    },
  });

  if (!ok) {
    rateErrors.add(1);
    console.error(`❌ Rate API failed: HTTP ${res.status} | ${pair.base}/${pair.quote} Tenor=${validTenor}`);
    return null;
  }

  const data       = res.json();
  const rateToken  = data.token;
  const valueDate  = data.valueDate || getExpectedValueDate(validTenor);

  console.log(`💱 Rate token acquired | Tenor=${validTenor} | ValueDate=${valueDate}`);
  return { rateToken, valueDate };
}

// -------------------------------------------------------
// Step 3 — Trade Booking (mirrors book_trade in Python)
// POST /api/trades
// -------------------------------------------------------
function bookTrade(token, pair, rateToken, validTenor, valueDate) {
  // Simple GUID-like unique reference per iteration
  const thirdPartyRef = `k6-${__VU}-${__ITER}-${Date.now()}`;

  const body = JSON.stringify({
    amount:                100,
    buyOrSell:             pair.side,
    currency:              pair.quote,
    clientId:              parseInt(pair.clientId),
    note:                  'k6 regression test trade',
    thirdPartyReferenceId: thirdPartyRef,
    jurisdiction:          JURISDICTION,
    token:                 rateToken,
    tenor:                 validTenor,
    valueDate:             valueDate,
  });

  const start = Date.now();
  const res = http.post(TRADE_URL, body, {
    headers: {
      'accept':          'text/plain',
      'Content-Type':    'application/json',
      'Fx-BrokerCode':   BROKER,
      'Authorization':   token,
    },
    tags: { name: 'trade_book' },
  });
  tradeResponseTime.add(Date.now() - start);

  const ok = check(res, {
    'trade: status 200 or 201': (r) => r.status === 200 || r.status === 201,
    'trade: has tradeId':       (r) => {
      try {
        const d = r.json();
        return !!(d.tradeId || d.id || d.dealId);
      } catch { return false; }
    },
  });

  tradeSuccessRate.add(ok);

  if (!ok) {
    tradeErrors.add(1);
    console.error(
      `❌ Trade booking failed: HTTP ${res.status} | ` +
      `${pair.base}/${pair.quote} Tenor=${validTenor} | ref=${thirdPartyRef}\n` +
      `   Body: ${res.body}`
    );
    return null;
  }

  const data = res.json();
  const tradeId = data.tradeId || data.id || data.dealId;
  console.log(
    `✅ Trade booked | tradeId=${tradeId} | ` +
    `${pair.base}/${pair.quote} Tenor=${validTenor} | ref=${thirdPartyRef}`
  );
  return tradeId;
}

// -------------------------------------------------------
// Main k6 default function
// Full flow: Auth → Tenor → Rate → Trade
// -------------------------------------------------------
export default function () {
  // Pick user and currency pair for this VU/iteration
  const userName = USERS[(__VU - 1) % USERS.length];
  const pair     = CURRENCY_PAIRS[(__VU - 1 + __ITER) % CURRENCY_PAIRS.length];

  console.log(`\n${'='.repeat(60)}`);
  console.log(`VU=${__VU} ITER=${__ITER} | User=${userName} | Pair=${pair.base}/${pair.quote}`);
  console.log(`${'='.repeat(60)}`);

  // ── Step 0: Auth ────────────────────────────────────
  const token = getProductApiToken(userName);
  if (!token) {
    console.error(`⛔ Aborting VU=${__VU} — auth failed`);
    return;
  }
  sleep(0.3);

  // ── Step 1: Tenor ───────────────────────────────────
  const tenorResult = getSoonestTenor(token, pair);
  if (!tenorResult) {
    console.error(`⛔ Aborting VU=${__VU} — tenor fetch failed`);
    return;
  }
  sleep(0.3);

  // ── Step 2: Rate ────────────────────────────────────
  const rateResult = getRate(token, pair, tenorResult.validTenor);
  if (!rateResult) {
    console.error(`⛔ Aborting VU=${__VU} — rate fetch failed`);
    return;
  }
  sleep(0.3);

  // ── Step 3: Trade ───────────────────────────────────
  bookTrade(
    token,
    pair,
    rateResult.rateToken,
    tenorResult.validTenor,
    rateResult.valueDate || tenorResult.valueDate,
  );

  sleep(0.5);
}

// -------------------------------------------------------
// Summary (mirrors _save_analysis in cut-off-comp.py)
// -------------------------------------------------------
export function handleSummary(data) {
  const ts         = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = `fx_trade_k6_summary_${ts}.json`;

  const summary = {
    timestamp: new Date().toISOString(),
    environment: ENV,
    jurisdiction: JURISDICTION,
    broker: BROKER,
    thresholds_pass: Object.values(data.metrics)
      .filter(m => m.thresholds)
      .every(m => Object.values(m.thresholds).every(t => t.ok)),
    metrics: {
      auth_p95_ms:    data.metrics['auth_response_time_ms']  ?.values['p(95)'],
      tenor_p95_ms:   data.metrics['tenor_response_time_ms'] ?.values['p(95)'],
      rate_p95_ms:    data.metrics['rate_response_time_ms']  ?.values['p(95)'],
      trade_p95_ms:   data.metrics['trade_response_time_ms'] ?.values['p(95)'],
      trade_success:  data.metrics['trade_success_rate']      ?.values['rate'],
      auth_errors:    data.metrics['auth_errors']             ?.values['count'],
      tenor_errors:   data.metrics['tenor_errors']            ?.values['count'],
      rate_errors:    data.metrics['rate_errors']             ?.values['count'],
      trade_errors:   data.metrics['trade_errors']            ?.values['count'],
    },
  };

  return {
    [outputFile]: JSON.stringify(summary, null, 2),
    'stdout':     textSummary(data, { indent: ' ', enableColors: true }),
  };
}

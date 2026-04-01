# Orangi Health v9.2 구현 명세서 — Claude Code 전달용

> **선행 작업**: CLAUDE.md와 HANDOFF.md를 먼저 읽고, 현재 코드 구조를 파악한 뒤 아래 순서대로 구현.
> **규칙**: 기존 CLAUDE.md의 "작업 시 주의사항" 12개 항목 준수. 특히 `esc()`, `kstToday()`, `nrs >= 0`, `fetchWithRetry` 등.
> **버전**: v9.2. 작업 완료 후 APP_VERSION 배열 맨 위에 추가, 백업 자동화 절차 수행.

---

## 기능 1: 처치 효과 회고 (Soft Retrospective)

### 목적
두통 기록 후 별도 알림 없이, **다음번 기록 시** 이전 처치의 효과를 원탭으로 평가.

### 데이터 구조 변경

기존 로그 엔트리에 `outcome` 필드 추가:
```javascript
// 기존 로그 엔트리 (orangi-migraine)
{
  id: 1234567890,
  datetime: '2026-03-30T14:30',
  nrs: 7,
  sites: ['왼쪽 관자놀이'],
  symptoms: ['구역', '빛과민'],
  meds: ['AAP 500mg'],
  treatments: ['GON block'],
  memo: '',
  // ★ 새로 추가
  outcome: {
    rating: 'good',        // 'good' | 'partial' | 'none' | null
    ratedAt: '2026-03-31T09:15'  // 평가 시점 (KST ISO)
  }
}
```

### 구현 위치 및 상세

#### 1-1. 미평가 기록 탐색 함수

**파일**: `index.html`
**위치**: `saveLog()` / `saveJournalLog()` 함수들 근처 (로그 관련 섹션)

```javascript
// ── 처치 효과 미평가 기록 찾기 ──
function getUnratedLogs() {
  if (S.currentDomain !== 'orangi-migraine') return [];
  const ds = D();
  if (!ds.logData?.length) return [];
  const now = new Date(kstNow().toISOString());
  return ds.logData.filter(l => {
    // 투약 또는 처치가 있고, outcome이 없고, 3일 이내
    const hasTreatment = (l.meds?.length > 0) || (l.treatments?.length > 0);
    const noOutcome = !l.outcome || !l.outcome.rating;
    const withinDays = (now - new Date(l.datetime)) <= 3 * 86400000;
    return hasTreatment && noOutcome && withinDays;
  });
}
```

#### 1-2. 회고 카드 렌더링

**파일**: `index.html`
**위치**: 편두통 로그 폼 렌더링 부분. `renderView('log')`에서 `S.logView === 'form'`일 때, 폼 HTML 최상단 (날짜 입력 위)에 삽입.

기존 코드에서 편두통 로그 폼이 시작되는 부분을 찾으면 `<div class="log-form">` 바로 안쪽에 들어감:

```javascript
function renderOutcomeCards() {
  const unrated = getUnratedLogs();
  if (!unrated.length) return '';

  return unrated.map((l, i) => {
    const date = l.datetime.slice(5, 10);
    const time = l.datetime.slice(11, 16);
    const nrs = l.nrs >= 0 ? `NRS ${l.nrs}` : '';
    const tx = [...(l.meds || []), ...(l.treatments || [])].join(', ');
    const idx = D().logData.indexOf(l);  // 원본 인덱스 찾기

    return `<div class="outcome-card" id="outcome-card-${idx}" style="
      padding:10px 14px;margin-bottom:8px;
      background:var(--sf2);border:1.5px solid var(--bd);border-radius:10px;
      border-left:3px solid var(--ac)">
      <div style="font-size:.75rem;color:var(--mu);margin-bottom:6px">
        📋 ${date} ${time} ${nrs} — <strong>${esc(tx)}</strong> 효과는?
      </div>
      <div style="display:flex;gap:8px">
        <button onclick="rateOutcome(${idx},'good')" class="outcome-btn" style="
          flex:1;padding:6px;border:1.5px solid #10b981;border-radius:8px;
          background:#f0fdf4;color:#10b981;font-size:.78rem;font-weight:600;cursor:pointer">
          ✅ 효과 좋음</button>
        <button onclick="rateOutcome(${idx},'partial')" class="outcome-btn" style="
          flex:1;padding:6px;border:1.5px solid #f59e0b;border-radius:8px;
          background:#fffbeb;color:#f59e0b;font-size:.78rem;font-weight:600;cursor:pointer">
          🔸 좀 나아짐</button>
        <button onclick="rateOutcome(${idx},'none')" class="outcome-btn" style="
          flex:1;padding:6px;border:1.5px solid #ef4444;border-radius:8px;
          background:#fef2f2;color:#ef4444;font-size:.78rem;font-weight:600;cursor:pointer">
          ❌ 안 들었음</button>
      </div>
    </div>`;
  }).join('');
}
```

#### 1-3. 평가 저장 함수

```javascript
async function rateOutcome(logIdx, rating) {
  const ds = D();
  const entry = ds.logData[logIdx];
  if (!entry) return;

  entry.outcome = {
    rating: rating,
    ratedAt: kstNow().toISOString()
  };

  // 카드 접기 애니메이션
  const card = document.getElementById('outcome-card-' + logIdx);
  if (card) {
    const labels = {good: '✅ 효과 좋음', partial: '🔸 좀 나아짐', none: '❌ 안 들었음'};
    card.innerHTML = `<div style="font-size:.75rem;color:var(--mu);text-align:center;padding:4px">
      ${labels[rating]} 기록됨</div>`;
    setTimeout(() => { card.style.display = 'none'; }, 1500);
  }

  try {
    await saveLogData();
    showToast('📝 처치 효과 기록됨');
  } catch(e) {
    showToast('⚠️ 저장 실패: ' + e.message);
  }
}
```

#### 1-4. 폼에 삽입

로그 폼 렌더링에서 편두통 도메인(`lc.sites` 존재)일 때, `<div class="log-form">` 바로 뒤에:
```javascript
// 기존: return `<div class="log-view-tabs">${viewTabs}</div><div class="log-form">...`
// 변경: renderOutcomeCards()를 log-form 안 최상단에 삽입
// <div class="log-form">${renderOutcomeCards()} ... 기존 폼 내용 ...
```

#### 1-5. quick.html에도 적용

quick/index.html의 폼 탭(`tab-form`) 렌더 시에도 동일 로직 적용.
quick.html은 localStorage의 `om_quick_logs`를 사용하므로, 해당 배열에서 미평가 건을 찾아 같은 UI 표시.

#### 1-6. 통계 연동 — 약물 효과율 차트

기존 `renderMedEffectAnalysis()`는 NRS 변화로 간접 추정함. outcome 데이터가 있으면 직접 효과율 계산하는 섹션 추가:

```javascript
// renderMedEffectAnalysis 함수 내부 또는 별도 함수
function renderOutcomeStats(logs) {
  const rated = logs.filter(l => l.outcome?.rating);
  if (rated.length < 3) return '';

  const medStats = {};
  rated.forEach(l => {
    (l.meds || []).forEach(med => {
      if (!medStats[med]) medStats[med] = {good:0, partial:0, none:0, total:0};
      medStats[med][l.outcome.rating]++;
      medStats[med].total++;
    });
  });

  // 3회 이상 사용된 약물만 표시
  const results = Object.entries(medStats)
    .filter(([,s]) => s.total >= 3)
    .sort((a,b) => b[1].total - a[1].total);

  if (!results.length) return '';

  // 수평 스택 바 차트로 렌더 (good=초록, partial=노랑, none=빨강)
  const rows = results.map(([med, s]) => {
    const gPct = Math.round(s.good / s.total * 100);
    const pPct = Math.round(s.partial / s.total * 100);
    const nPct = 100 - gPct - pPct;
    return `<div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:.78rem;margin-bottom:3px">
        <span>${esc(med)}</span>
        <span style="color:var(--mu)">${s.total}회 (좋음 ${gPct}%)</span>
      </div>
      <div style="display:flex;height:16px;border-radius:4px;overflow:hidden;background:var(--bd)">
        ${gPct ? `<div style="width:${gPct}%;background:#10b981"></div>` : ''}
        ${pPct ? `<div style="width:${pPct}%;background:#f59e0b"></div>` : ''}
        ${nPct ? `<div style="width:${nPct}%;background:#ef4444"></div>` : ''}
      </div>
    </div>`;
  }).join('');

  return `<div class="card">
    <div class="card-title">💊 약물 효과 평가 (직접 평가 기반)</div>
    <div style="display:flex;gap:12px;justify-content:center;margin-bottom:10px;flex-wrap:wrap">
      <span style="font-size:.65rem;color:var(--mu)">🟩 효과 좋음</span>
      <span style="font-size:.65rem;color:var(--mu)">🟨 좀 나아짐</span>
      <span style="font-size:.65rem;color:var(--mu)">🟥 안 들었음</span>
    </div>
    ${rows}
    <div style="font-size:.62rem;color:var(--mu2);text-align:center;margin-top:6px">최소 3회 이상 투약 데이터 기준.</div>
  </div>`;
}
```

stats 뷰 렌더링(`renderView('stats')`)에서 기존 `renderMedEffectAnalysis()` 바로 아래에 `renderOutcomeStats(logs)` 호출 추가.

---

## 기능 2: 트리거 기록

### 목적
편두통 발생 시 추정 트리거를 칩으로 선택. 증상/투약 칩과 동일 UX.

### 데이터 구조 변경

#### logConfig 변경 (orangi-migraine)
```javascript
// DOMAINS['orangi-migraine'].logConfig에 추가:
triggers: ['수면부족','과수면','수면분절','공복','불규칙식사','카페인','알코올','스트레스','피로','강한빛','소음','냄새','운동후','긴장/자세']
```

#### 로그 엔트리에 triggers 필드 추가
```javascript
{ ..., triggers: ['수면부족', '공복'], ... }
```

### 구현 위치 및 상세

#### 2-1. logConfig에 triggers 추가

**파일**: `index.html`
**위치**: `DOMAINS` 객체 → `orangi-migraine` → `logConfig`

기존:
```javascript
logConfig: {
  sites: {left:[...], right:[...]},
  painTypes: [...],
  symptoms: [...],
  meds: [...],
  treatments: [...],
  nrsLabel: '통증 강도 (NRS)',
},
```

변경 (triggers 추가):
```javascript
logConfig: {
  sites: {left:[...], right:[...]},
  painTypes: [...],
  triggers: ['수면부족','과수면','수면분절','공복','불규칙식사','카페인','알코올','스트레스','피로','강한빛','소음','냄새','운동후','긴장/자세'],
  symptoms: [...],
  meds: [...],
  treatments: [...],
  nrsLabel: '통증 강도 (NRS)',
},
```

#### 2-2. 로그 폼에 트리거 칩 섹션 추가

**위치**: 편두통 로그 폼 렌더링 부분. 통증 종류(`painTypesHtml`) 바로 아래, 증상(symptoms) 위.

```javascript
// 트리거 칩 섹션 (triggers가 있는 도메인만)
const customTriggers = JSON.parse(localStorage.getItem('om_custom_triggers_' + S.currentDomain) || '[]');
const triggersHtml = lc.triggers ? `
  <div class="log-section-title">추정 트리거 <button onclick="openChipManager('triggers')" style="background:none;border:none;cursor:pointer;font-size:.62rem;color:var(--mu2);margin-left:4px">✏️관리</button></div>
  <div class="log-chips">${[...lc.triggers, ...customTriggers].map(t =>
    `<div class="log-chip" data-group="trigger" data-val="${t}" onclick="toggleChip(this,'sel-trigger')">${t}</div>`
  ).join('')}
    <div style="display:flex;gap:4px;align-items:center">
      <input class="log-other-input" id="trigger-other" placeholder="직접 입력" style="width:80px">
      <button onclick="addCustomTrigger()" style="background:var(--ac);color:#fff;border:none;border-radius:5px;padding:4px 8px;font-size:.7rem;cursor:pointer">+고정</button>
    </div>
  </div>` : '';
```

#### 2-3. 커스텀 트리거 추가 함수

```javascript
function addCustomTrigger() {
  const el = document.getElementById('trigger-other');
  const val = (el?.value || '').trim();
  if (!val) return;
  const key = 'om_custom_triggers_' + S.currentDomain;
  const list = JSON.parse(localStorage.getItem(key) || '[]');
  if (!list.includes(val)) { list.push(val); localStorage.setItem(key, JSON.stringify(list)); }
  el.value = '';
  const saved = _saveLogFormState();
  renderView('log');
  _restoreLogFormState(saved);
  showToast(`✅ "${val}" 고정됨`);
}
```

#### 2-4. saveLog()에서 triggers 수집

기존 `saveLog()` 함수에서 sites, symptoms, meds, treatments 수집하는 패턴과 동일하게:

```javascript
// triggers 수집 (기존 symptoms 수집 바로 아래)
const triggers = [];
document.querySelectorAll('.log-chip.sel[data-group="trigger"]').forEach(el => triggers.push(el.dataset.val));
const triggerOther = document.getElementById('trigger-other')?.value.trim();
if (triggerOther) triggers.push(triggerOther);
```

로그 엔트리 객체에 포함:
```javascript
const entry = { ..., triggers, ... };
```

#### 2-5. editLogEntry()에서 triggers 복원

기존 `editLogEntry(idx)` 함수에서 symptoms를 복원하는 패턴과 동일:

```javascript
// Triggers
(entry.triggers || []).forEach(s => {
  document.querySelectorAll('.log-chip[data-group="trigger"]').forEach(c => {
    if (c.dataset.val === s) c.classList.add('sel', 'sel-trigger');
  });
});
```

#### 2-6. 로그 목록/상세에 트리거 태그 표시

`renderLogList()` 함수에서 증상 태그 표시하는 부분 아래에:
```javascript
// triggers 태그 (있으면)
${(l.triggers || []).map(t => `<span class="log-tag" style="background:#fef3c7;color:#92400e">⚡${esc(t)}</span>`).join('')}
```

#### 2-7. CSS 추가 (style.css)

```css
.sel-trigger { background: #fef3c7 !important; color: #92400e !important; border-color: #f59e0b !important; }
```

#### 2-8. quick.html에도 트리거 칩 추가

quick/index.html의 `TRIGGERS` 상수 추가 및 폼에 칩 섹션 렌더. 기존 SYMPTOMS, MEDS, TREATMENTS 패턴과 동일.

#### 2-9. getRecentLogSummary()에 triggers 포함

기존 편두통 모드 요약에 트리거 추가:
```javascript
// 기존: `${l.datetime.slice(5,16)} ${(l.sites||[]).join('+')||'-'}${l.nrs>=0?' NRS'+l.nrs:''}`
// 변경: 트리거가 있으면 뒤에 추가
const triggerStr = (l.triggers?.length) ? ' ⚡' + l.triggers.join('+') : '';
```

#### 2-10. CSV 내보내기에 triggers 컬럼 추가

`exportLogCSV()` 편두통 모드에서:
```javascript
// 기존: csv='날짜,시간,NRS,부위,증상,투약,치료,메모\n';
// 변경:
csv='날짜,시간,NRS,부위,트리거,증상,투약,치료,메모\n';
// 각 행에 triggers 추가:
csv+=`...,"${(l.triggers||[]).join(';')}","${(l.symptoms||[]).join(';')}",...\n`;
```

#### 2-11. 생리주기 교차 도메인 자동 태그

`getCrossDomainContext()` 함수에서 붕룩이 도메인의 생리주기 데이터를 가져오는 건 이미 있음. 추가로, 편두통 기록 저장 시 붕룩이 도메인에서 최근 생리 기록이 있으면 자동으로 `triggers`에 "생리 D+N" 태그를 추가하는 로직:

```javascript
// saveLog() 내부, triggers 수집 후
// 붕룩이 도메인에서 생리주기 데이터 가져오기
function getMenstrualTag() {
  const bds = S.domainState['bungruki'];
  if (!bds?.logData?.length) return null;
  // 최근 생리 시작 기록 찾기 (카테고리에 '생리' 또는 '월경' 포함)
  const menstrualLogs = bds.logData
    .filter(l => (l.categories || []).some(c => c.includes('생리') || c.includes('월경')))
    .sort((a, b) => b.datetime.localeCompare(a.datetime));
  if (!menstrualLogs.length) return null;
  const lastDate = menstrualLogs[0].datetime.slice(0, 10);
  const today = kstToday();
  const diff = Math.round((new Date(today + 'T00:00:00') - new Date(lastDate + 'T00:00:00')) / 86400000);
  if (diff >= 0 && diff <= 7) return `생리 D+${diff}`;
  if (diff > 7 && diff <= 35) return null; // 주기 중간은 태그 안 붙임
  return null;
}

// saveLog에서 사용:
const menstrualTag = getMenstrualTag();
if (menstrualTag && !triggers.includes(menstrualTag)) triggers.push(menstrualTag);
```

---

## 기능 3: 날씨 자동 수집

### 목적
두통 기록 저장 시 날씨 API 자동 호출 → 기록에 첨부. 사용자 조작 불필요.

### 날씨 API 선택

**기상청 단기예보 API** (공공데이터포털):
- URL: `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst`
- 인증: 이미 식약처 API 키 패턴이 있으니 동일 방식
- 좌표: 서울 강동구 길동 → 격자 좌표 nx=62, ny=126

**대안 (더 간단)**: OpenWeatherMap 무료 API
- URL: `https://api.openweathermap.org/data/2.5/weather?lat=37.5326&lon=127.1378&appid={KEY}&units=metric&lang=kr`
- 무료: 1000회/일
- 반환: temp, humidity, pressure, weather[0].description

**권장**: OpenWeatherMap이 응답 구조가 단순하고 기압(pressure) 데이터가 바로 나옴. 기상청 API는 격자 변환 필요하고 응답 파싱이 복잡함.

### 데이터 구조

```javascript
// 로그 엔트리에 추가
{
  ...,
  weather: {
    temp: 12.3,           // °C
    humidity: 65,         // %
    pressure: 1013,       // hPa
    condition: '흐림',     // 한글 날씨
    windSpeed: 3.2,       // m/s (선택)
    fetchedAt: '2026-03-31T14:30'
  }
}
```

### 구현 상세

#### 3-1. API 키 관리

기존 AI API 키 관리 UI(설정 모달)에 "날씨 API 키" 입력란 추가. 또는 코드에 내장 (무료 키라 큰 문제 없음).

```javascript
const _WEATHER_API_KEY = ''; // OpenWeatherMap API key — 사용자가 설정에서 입력하거나 코드 내장
const _WEATHER_LAT = 37.5326; // 서울 강동구 길동
const _WEATHER_LON = 127.1378;
```

#### 3-2. 날씨 fetch 함수

```javascript
async function fetchWeather() {
  const key = _WEATHER_API_KEY || localStorage.getItem('om_weather_key') || '';
  if (!key) return null;
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${_WEATHER_LAT}&lon=${_WEATHER_LON}&appid=${key}&units=metric&lang=kr`;
    const res = await fetchWithRetry(url, {}, 1);
    if (!res.ok) return null;
    const d = await res.json();
    return {
      temp: Math.round(d.main.temp * 10) / 10,
      humidity: d.main.humidity,
      pressure: d.main.pressure,
      condition: d.weather?.[0]?.description || '',
      windSpeed: d.wind?.speed || 0,
      fetchedAt: kstNow().toISOString()
    };
  } catch(e) {
    console.warn('Weather fetch failed:', e);
    return null;
  }
}
```

#### 3-3. saveLog()에 날씨 자동 첨부

편두통 도메인(`orangi-migraine`)에서 `saveLog()` 실행 시:

```javascript
// saveLog 함수 내부, entry 객체 생성 직후, saveLogData() 호출 전
// 날씨는 비동기로 가져오되 저장을 지연시키지 않음
const entry = { id, datetime, nrs, sites, painType, triggers, symptoms, meds, treatments, memo };

// 날씨 비동기 첨부 (저장 후 업데이트)
fetchWeather().then(w => {
  if (w) {
    entry.weather = w;
    saveLogData(); // 날씨 포함해서 재저장
  }
});
```

또는 더 깔끔하게: saveLog를 async로 만들고 날씨를 먼저 가져온 뒤 저장:
```javascript
// 권장 방식: 날씨를 먼저 가져오고 (타임아웃 2초) 저장
let weather = null;
try {
  weather = await Promise.race([
    fetchWeather(),
    new Promise(r => setTimeout(() => r(null), 2000)) // 2초 타임아웃
  ]);
} catch(e) {}
if (weather) entry.weather = weather;
```

#### 3-4. quick.html에도 날씨 첨부

quick/index.html의 저장 함수에도 동일 적용. OpenWeatherMap fetch → entry.weather 에 저장.

#### 3-5. 로그 목록에 날씨 표시

로그 목록에서 날씨가 있는 기록은 작은 아이콘으로 표시:
```javascript
// renderLogList() 내부, 각 로그 아이템에
const weatherTag = l.weather
  ? `<span style="font-size:.62rem;color:var(--mu2)">${l.weather.condition} ${l.weather.temp}° ${l.weather.pressure}hPa</span>`
  : '';
```

#### 3-6. 설정 UI

기존 사이드바 설정 또는 키 관리 모달에 날씨 API 키 입력란 추가:
```html
<div class="dx-form-group">
  <div class="dx-form-label">날씨 API 키 (OpenWeatherMap)</div>
  <input class="dx-form-input" id="weather-key" placeholder="무료 키 발급: openweathermap.org">
  <div style="font-size:.65rem;color:var(--mu2)">기록 시 날씨가 자동으로 첨부됩니다 (서울 강동구)</div>
</div>
```

---

## 기능 4: 통계 시각화 강화

### 목적
기존 텍스트 기반 통계를 SVG 차트로 보강.

### 구현할 차트 목록

1. **트리거-NRS 상관 차트** (수평 막대)
2. **기압-두통 산점도** (weather.pressure vs NRS)
3. **주간 추이 라인 차트** (NRS 평균)
4. **약물 효과율 차트** → 기능 1에서 이미 구현 (`renderOutcomeStats`)

### 구현 위치

**파일**: `index.html`
**위치**: `renderView('stats')` → stats 뷰 렌더 함수 (기존 `renderMedEffectAnalysis` 등이 있는 곳)

#### 4-1. 트리거-NRS 상관 차트

```javascript
function renderTriggerNrsChart(logs) {
  const triggerLogs = logs.filter(l => l.triggers?.length && l.nrs >= 0);
  if (triggerLogs.length < 5) return '';

  const stats = {};
  triggerLogs.forEach(l => {
    (l.triggers || []).forEach(t => {
      if (!stats[t]) stats[t] = { sum: 0, count: 0 };
      stats[t].sum += l.nrs;
      stats[t].count++;
    });
  });

  const results = Object.entries(stats)
    .filter(([, s]) => s.count >= 2)
    .map(([t, s]) => ({ trigger: t, avg: s.sum / s.count, count: s.count }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 8);

  if (!results.length) return '';

  const maxAvg = Math.max(...results.map(r => r.avg), 10);

  const bars = results.map(r => {
    const pct = Math.round(r.avg / maxAvg * 100);
    const color = r.avg >= 7 ? '#ef4444' : r.avg >= 4 ? '#f59e0b' : '#10b981';
    return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <span style="min-width:80px;font-size:.72rem;text-align:right;color:var(--ink)">${esc(r.trigger)}</span>
      <div style="flex:1;height:18px;background:var(--bd);border-radius:4px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:${color};border-radius:4px;transition:width .3s"></div>
      </div>
      <span style="min-width:50px;font-size:.68rem;color:var(--mu)">${r.avg.toFixed(1)} (${r.count}회)</span>
    </div>`;
  }).join('');

  return `<div class="card">
    <div class="card-title">⚡ 트리거별 평균 NRS</div>
    ${bars}
    <div style="font-size:.62rem;color:var(--mu2);text-align:center;margin-top:6px">최소 2회 이상 기록된 트리거만 표시.</div>
  </div>`;
}
```

#### 4-2. 기압-두통 산점도

```javascript
function renderPressureChart(logs) {
  const weatherLogs = logs.filter(l => l.weather?.pressure && l.nrs >= 0);
  if (weatherLogs.length < 5) return '';

  // SVG 산점도
  const W = 320, H = 180, pad = 40;
  const pressures = weatherLogs.map(l => l.weather.pressure);
  const nrsVals = weatherLogs.map(l => l.nrs);
  const pMin = Math.min(...pressures) - 5, pMax = Math.max(...pressures) + 5;

  const dots = weatherLogs.map(l => {
    const x = pad + (l.weather.pressure - pMin) / (pMax - pMin) * (W - pad * 2);
    const y = H - pad - (l.nrs / 10) * (H - pad * 2);
    const color = l.nrs >= 7 ? '#ef4444' : l.nrs >= 4 ? '#f59e0b' : '#10b981';
    return `<circle cx="${x}" cy="${y}" r="4" fill="${color}" opacity=".7"/>`;
  }).join('');

  // 축
  const xAxis = `<line x1="${pad}" y1="${H-pad}" x2="${W-pad}" y2="${H-pad}" stroke="var(--bd)" stroke-width="1"/>`;
  const yAxis = `<line x1="${pad}" y1="${pad}" x2="${pad}" y2="${H-pad}" stroke="var(--bd)" stroke-width="1"/>`;
  const xLabel = `<text x="${W/2}" y="${H-5}" text-anchor="middle" font-size="10" fill="var(--mu)">기압 (hPa)</text>`;
  const yLabel = `<text x="12" y="${H/2}" text-anchor="middle" font-size="10" fill="var(--mu)" transform="rotate(-90,12,${H/2})">NRS</text>`;
  const pMinLabel = `<text x="${pad}" y="${H-pad+14}" text-anchor="middle" font-size="9" fill="var(--mu2)">${pMin}</text>`;
  const pMaxLabel = `<text x="${W-pad}" y="${H-pad+14}" text-anchor="middle" font-size="9" fill="var(--mu2)">${pMax}</text>`;

  return `<div class="card">
    <div class="card-title">🌡️ 기압 vs NRS 상관</div>
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:400px;display:block;margin:0 auto">
      ${xAxis}${yAxis}${xLabel}${yLabel}${pMinLabel}${pMaxLabel}${dots}
    </svg>
    <div style="font-size:.62rem;color:var(--mu2);text-align:center;margin-top:6px">${weatherLogs.length}건 데이터. 날씨 기록이 쌓일수록 정확해집니다.</div>
  </div>`;
}
```

#### 4-3. 주간 NRS 추이 라인 차트

```javascript
function renderWeeklyTrendChart(logs) {
  const last30 = logs.filter(l => l.nrs >= 0 && (Date.now() - new Date(l.datetime)) <= 30 * 86400000);
  if (last30.length < 5) return '';

  // 일별 평균 NRS
  const byDay = {};
  last30.forEach(l => {
    const d = l.datetime.slice(0, 10);
    if (!byDay[d]) byDay[d] = [];
    byDay[d].push(l.nrs);
  });

  const days = Object.keys(byDay).sort();
  const avgs = days.map(d => byDay[d].reduce((a, b) => a + b, 0) / byDay[d].length);

  const W = 320, H = 140, pad = 35;
  const xStep = days.length > 1 ? (W - pad * 2) / (days.length - 1) : 0;

  const points = avgs.map((avg, i) => {
    const x = pad + i * xStep;
    const y = H - pad - (avg / 10) * (H - pad * 2);
    return `${x},${y}`;
  });

  const polyline = `<polyline points="${points.join(' ')}" fill="none" stroke="var(--ac)" stroke-width="2"/>`;
  const dots = avgs.map((avg, i) => {
    const x = pad + i * xStep;
    const y = H - pad - (avg / 10) * (H - pad * 2);
    const color = avg >= 7 ? '#ef4444' : avg >= 4 ? '#f59e0b' : '#10b981';
    return `<circle cx="${x}" cy="${y}" r="3" fill="${color}"/>`;
  }).join('');

  // X축 라벨 (7일 간격)
  const xLabels = days.filter((_, i) => i % 7 === 0 || i === days.length - 1).map(d => {
    const i = days.indexOf(d);
    const x = pad + i * xStep;
    return `<text x="${x}" y="${H - pad + 14}" text-anchor="middle" font-size="8" fill="var(--mu2)">${d.slice(5)}</text>`;
  }).join('');

  return `<div class="card">
    <div class="card-title">📈 일별 NRS 추이 (최근 30일)</div>
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:400px;display:block;margin:0 auto">
      <line x1="${pad}" y1="${H-pad}" x2="${W-pad}" y2="${H-pad}" stroke="var(--bd)" stroke-width="1"/>
      <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${H-pad}" stroke="var(--bd)" stroke-width="1"/>
      ${polyline}${dots}${xLabels}
    </svg>
  </div>`;
}
```

#### 4-4. stats 뷰에 차트 삽입

`renderView('stats')` 함수에서 기존 통계 카드들 아래에 추가:
```javascript
// 기존 stats 렌더 끝부분에 추가
html += renderOutcomeStats(last30);      // 기능 1
html += renderTriggerNrsChart(last30);   // 기능 4-1
html += renderPressureChart(last30);     // 기능 4-2
html += renderWeeklyTrendChart(last30);  // 기능 4-3
```

---

## 기능 5: 경량 모드 (빠른 경과 확인)

### 목적
단순 f/u이나 빠른 요약에 5개 AI 풀가동 대신 1개 AI만 사용하는 경량 모드.

### 구현 상세

#### 5-1. 홈 뷰에 "빠른 체크" 버튼 추가

**위치**: `renderView('home')` → 기존 "새 세션" 버튼 근처

```html
<button class="btn-quick-check" onclick="startLightMode()" style="
  display:flex;align-items:center;gap:8px;padding:12px 20px;
  background:linear-gradient(135deg,#f0fdf4,#eff6ff);
  border:1.5px solid var(--bd);border-radius:12px;cursor:pointer;
  font-size:.88rem;width:100%;margin-bottom:12px">
  <span style="font-size:1.2rem">⚡</span>
  <div style="text-align:left">
    <div style="font-weight:600;color:var(--ink)">빠른 체크</div>
    <div style="font-size:.68rem;color:var(--mu)">AI 1개 · 최근 기록 기반 빠른 요약</div>
  </div>
</button>
```

#### 5-2. startLightMode() 함수

```javascript
function startLightMode() {
  // AI 1개 선택: Claude 우선, 없으면 키가 있는 첫 번째 AI
  const preferred = ['claude', 'gpt', 'gemini', 'grok', 'perp'];
  const aiId = preferred.find(id => S.keys[id]);
  if (!aiId) { showToast('❌ API 키가 없습니다.'); return; }

  // 자동 프롬프트 생성
  const dc = DC();
  const recentSummary = getRecentLogSummary();
  const crossCtx = getCrossDomainContext();
  const warnings = detectDangerousPatterns();
  const warningText = warnings.length
    ? '\n[⚠️ 감지된 패턴]\n' + warnings.map(w => '- ' + w.text).join('\n')
    : '';

  const autoQuestion = `최근 기록 기반 빠른 상태 체크를 해주세요.
${recentSummary}
${warningText}

다음을 간결하게 (5문장 이내) 답해주세요:
1. 현재 상태 요약 (추세)
2. 주의할 점
3. 다음 조치 권장사항`;

  // 세션 시작 (경량 모드 플래그)
  S.session = {
    question: autoQuestion,
    rounds: [],
    summary: null,
    date: kstToday(),
    mode: 'light',
    lightAI: aiId,
    currentRound: 0,
  };
  S._dirty = true;
  switchView('session');

  // 자동 실행 — 선택된 AI 1개만
  runLightRound(aiId);
}
```

#### 5-3. runLightRound() 함수

```javascript
async function runLightRound(aiId) {
  if (S.generating) return;
  S.generating = true;

  const dc = DC();
  const m = DM();
  const system = `${m.patient_context || dc.defaultContext}
${getCrossDomainContext()}
${_CONCISE}`;

  const round = { round: 1, answers: {}, timestamp: kstNow().toISOString() };

  // 세션 뷰에 1개 AI 카드만 표시
  renderView('session');

  try {
    const ac = new AbortController();
    if (!S._abortControllers) S._abortControllers = {};
    S._abortControllers[aiId] = ac;

    const text = await callAIStream(
      aiId, system, S.session.question,
      (partial) => {
        // 스트리밍 업데이트
        const card = document.getElementById('ai-card-' + aiId);
        if (card) {
          const body = card.querySelector('.ai-body');
          if (body) body.innerHTML = DOMPurify.sanitize(marked.parse(partial));
        }
      },
      ac.signal
    );

    round.answers[aiId] = text;
  } catch(e) {
    round.answers[aiId] = '⚠️ ' + (e.message || '오류');
  }

  S.session.rounds.push(round);
  S.generating = false;

  // 바로 요약 (경량이므로 별도 요약 라운드 없이 응답이 곧 요약)
  S.session.summary = {
    session_summary: round.answers[aiId]?.slice(0, 200) || '',
    final_recommendation: '',
    mode: 'light'
  };

  renderView('session');
  saveMaster();
}
```

#### 5-4. 세션 뷰에서 경량 모드 분기

기존 세션 렌더링에서 `S.session.mode === 'light'` 일 때:
- AI 카드를 1개만 렌더
- "다음 라운드" 버튼 대신 "⚡ 추가 질문" (원하면 같은 AI로 이어서) + "🔄 풀 세션으로 전환" 버튼 표시
- 풀 세션 전환: `S.session.mode = 'normal'`로 변경 후 일반 세션처럼 진행

---

## 기능 6: ntfy 경과 알림 (두통 기록 2~3시간 후 푸시)

### 목적
오랑이가 두통 기록 후 2~3시간 뒤, ntfy 앱을 통해 경과 확인 푸시 알림을 받음. 알림 클릭 → quick.html에서 경과 입력.

### ntfy란
무료 오픈소스 HTTP 기반 푸시 알림 서비스. 가입 불필요. 앱 설치 후 토픽 구독하면 HTTP POST로 푸시 발송 가능.
- URL: `https://ntfy.sh/{토픽명}`
- 앱: iOS App Store / Android Play Store에서 "ntfy" 검색

### 셋업
1. 오랑이 폰에 ntfy 앱 설치 → 토픽 구독 (예: `orangi-ha-{랜덤}`)
2. 앱 설정에서 ntfy 토픽명 입력란 추가 (API 키 설정 근처)
3. GAS에서 기록 저장 시 2시간 후 트리거 예약 → ntfy POST

### GAS 변경 (gas-quicklog.js)

#### 6-1. sendNotification 함수에 ntfy 경과 알림 트리거 예약 추가

```javascript
function sendNotification(entry) {
  // 기존 이메일 알림 코드 유지...

  // ★ ntfy 경과 알림 예약 (2시간 후)
  try {
    var ntfyTopic = PropertiesService.getScriptProperties().getProperty('NTFY_TOPIC');
    if (ntfyTopic) {
      // 2시간 후 트리거 생성
      var trigger = ScriptApp.newTrigger('sendFollowUpNtfy')
        .timeBased()
        .after(2 * 60 * 60 * 1000) // 2시간
        .create();
      // 트리거 ID와 엔트리 정보를 저장
      var props = PropertiesService.getScriptProperties();
      props.setProperty('followup_' + trigger.getUniqueId(), JSON.stringify({
        entryId: entry.id,
        nrs: entry.nrs,
        meds: entry.meds || [],
        treatments: entry.treatments || [],
        datetime: entry.datetime
      }));
    }
  } catch(e) {
    Logger.log('ntfy trigger setup failed: ' + e.message);
  }
}
```

#### 6-2. sendFollowUpNtfy 함수 (새로 추가)

```javascript
function sendFollowUpNtfy(e) {
  var props = PropertiesService.getScriptProperties();
  var ntfyTopic = props.getProperty('NTFY_TOPIC');
  if (!ntfyTopic) return;

  // 트리거에 연결된 엔트리 찾기
  var triggerId = e.triggerUid;
  var dataStr = props.getProperty('followup_' + triggerId);
  if (!dataStr) return;

  try {
    var data = JSON.parse(dataStr);
    var nrs = data.nrs >= 0 ? 'NRS ' + data.nrs : '';
    var tx = (data.meds || []).concat(data.treatments || []).join(', ');
    var time = (data.datetime || '').split('T')[1] || '';

    // quick.html URL (경과 입력 모드)
    var quickUrl = props.getProperty('QUICK_URL') || '';
    var followupUrl = quickUrl ? quickUrl + '?followup=' + data.entryId : '';

    UrlFetchApp.fetch('https://ntfy.sh/' + ntfyTopic, {
      method: 'post',
      headers: {
        'Title': '🤕 두통 경과 확인',
        'Priority': '4',
        'Tags': 'headache',
        'Click': followupUrl
      },
      payload: time + ' ' + nrs + ' ' + tx + ' → 지금 어때요?'
    });
  } catch(err) {
    Logger.log('ntfy send failed: ' + err.message);
  }

  // cleanup
  props.deleteProperty('followup_' + triggerId);
  // 트리거 삭제
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getUniqueId() === triggerId) ScriptApp.deleteTrigger(t);
  });
}
```

#### 6-3. quick.html에 경과 입력 모드 추가

URL 파라미터 `?followup=엔트리ID`로 접근하면:
- 일반 기록 폼 대신 간소화된 경과 입력 UI 표시
- NRS 슬라이더 + 칩 3개 (효과 좋음 / 좀 나아짐 / 안 들었음) + 메모
- 저장 시 해당 엔트리의 `outcome` 필드에 기록

```javascript
// quick.html 상단에 추가
function checkFollowupMode() {
  var params = new URLSearchParams(location.search);
  var followupId = params.get('followup');
  if (!followupId) return false;

  // 경과 입력 UI 렌더
  document.getElementById('tab-form').innerHTML = `
    <div style="text-align:center;padding:20px">
      <div style="font-size:1.5rem;margin-bottom:12px">🤕 경과 확인</div>
      <div style="font-size:.85rem;color:var(--mu);margin-bottom:20px">아까 두통, 지금 어때요?</div>
      <div style="margin-bottom:16px">
        <div style="font-size:.78rem;margin-bottom:8px">현재 NRS</div>
        <input type="range" min="0" max="10" value="3" id="fu-nrs"
          oninput="document.getElementById('fu-nrs-val').textContent=this.value"
          style="width:100%">
        <div id="fu-nrs-val" style="font-size:1.2rem;font-weight:700">3</div>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:16px">
        <button onclick="saveFollowup('${followupId}','good')" style="flex:1;padding:12px;border:2px solid #10b981;border-radius:10px;background:#f0fdf4;color:#10b981;font-size:.85rem;font-weight:700;cursor:pointer">
          ✅ 효과 좋음</button>
        <button onclick="saveFollowup('${followupId}','partial')" style="flex:1;padding:12px;border:2px solid #f59e0b;border-radius:10px;background:#fffbeb;color:#f59e0b;font-size:.85rem;font-weight:700;cursor:pointer">
          🔸 좀 나아짐</button>
        <button onclick="saveFollowup('${followupId}','none')" style="flex:1;padding:12px;border:2px solid #ef4444;border-radius:10px;background:#fef2f2;color:#ef4444;font-size:.85rem;font-weight:700;cursor:pointer">
          ❌ 안 들었음</button>
      </div>
      <textarea id="fu-memo" placeholder="메모 (선택)" rows="2"
        style="width:100%;border:1.5px solid var(--bd);border-radius:8px;padding:8px;font-size:.82rem"></textarea>
    </div>`;
  return true;
}

async function saveFollowup(entryId, rating) {
  var nrs = parseInt(document.getElementById('fu-nrs').value);
  var memo = document.getElementById('fu-memo')?.value || '';

  // 로컬 로그에서 해당 엔트리 찾아서 outcome 추가
  var logs = getQuickLogs();
  var entry = logs.find(l => String(l.id) === String(entryId));
  if (entry) {
    entry.outcome = { rating: rating, nrs: nrs, memo: memo, ratedAt: kstNow().date + 'T' + kstNow().time };
    localStorage.setItem(LS_KEY, JSON.stringify(logs));
  }

  // 클라우드에도 저장
  var url = getSyncUrl();
  if (url) {
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'save', entries: entry ? [entry] : [] }),
        redirect: 'follow'
      });
    } catch(e) {}
  }

  showToast('✅ 경과 기록 완료!');
  setTimeout(() => { location.href = location.pathname; }, 1500);
}
```

#### 6-4. 메인 앱 설정에 ntfy 토픽 입력란

기존 API 키 설정 모달에 추가:
```html
<div class="dx-form-group">
  <div class="dx-form-label">ntfy 토픽 (경과 알림)</div>
  <input class="dx-form-input" id="ntfy-topic" placeholder="예: orangi-ha-7x9k2m">
  <div style="font-size:.65rem;color:var(--mu2)">오랑이 폰 ntfy 앱에서 같은 토픽을 구독해야 합니다</div>
</div>
```

저장 시 GAS의 ScriptProperties에 `NTFY_TOPIC` 값 설정:
```javascript
// 설정 저장 시
async function saveNtfyTopic() {
  var topic = document.getElementById('ntfy-topic')?.value.trim();
  if (!topic) return;
  localStorage.setItem('om_ntfy_topic', topic);
  // GAS에도 전달
  var url = getQuickSyncUrl();
  if (url) {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'setConfig', key: 'NTFY_TOPIC', value: topic }),
      redirect: 'follow'
    });
  }
  showToast('✅ ntfy 토픽 저장됨');
}
```

GAS에 `setConfig` 액션 처리 추가:
```javascript
// doPost 함수에 추가
} else if (data.action === 'setConfig') {
  PropertiesService.getScriptProperties().setProperty(data.key, data.value);
}
```

---

## 기능 7: 붕룩이 전용 관리 대시보드

### 목적
현재 붕룩이 도메인의 "임신 준비 관리" 탭이 다른 도메인과 동일한 질환 관리 구조를 쓰고 있음. 임신 준비에 맞는 전용 대시보드로 교체.

### 구현할 섹션 5개

#### 7-1. 생리주기 트래커

**데이터 구조** (master JSON에 추가):
```javascript
// bungruki_master.json
{
  ...,
  menstrualCycles: [
    {
      id: 1234567890,
      startDate: '2026-03-01',   // LMP
      endDate: '2026-03-05',     // 생리 종료일
      length: 28,                // 이번 주기 길이 (자동 계산)
      flow: 'moderate',          // light/moderate/heavy
      pain: 3,                   // 0-10
      symptoms: ['두통', '복통'],
      memo: ''
    }
  ]
}
```

**UI**: `renderView('meds')` (붕룩이 도메인일 때) → 기존 질환 카드 대신 전용 대시보드 렌더.

캘린더 형태:
- 날짜 터치 → 생리 시작/끝 마킹
- 생리일: 빨간 배경, 추정 배란일: 보라 점, 가임기: 연보라 배경
- 배란 추정일 = LMP + 주기길이 - 14
- 가임기 = 배란일 ±3일
- 주기 길이는 최근 3회 평균으로 자동 계산

**약물-주기 영향**: 교차 도메인에서 오랑이 편두통/마음관리의 약물 변경 이력을 가져와서, 주기 변화와 타임라인 겹침 표시.

#### 7-2. 일일 체크리스트

**데이터 구조**:
```javascript
// master JSON에 추가
{
  ...,
  dailyChecks: {
    '2026-03-31': {
      orangi: {
        folicAcid: true,      // 엽산
        iron: true,           // 철분
        vitaminD: false,      // 비타민D
        meals: 2,             // 식사 횟수 (0-3)
        weight: 40.2          // 체중 kg (선택)
      },
      bung: {
        arginine: true,       // 아르기닌
        coq10: true,          // CoQ10
        silymarin: false,     // 실리마린
        multivitamin: true,   // 멀티비타민
        exercise: 'cardio',   // null / 'cardio' / 'strength' / 'stretch'
        alcohol: false,       // 음주 여부
        febuxostat: false     // Febuxostat 복용
      }
    }
  }
}
```

**UI**: 오늘 날짜 기본 표시. 각 항목은 토글 버튼 또는 체크박스. "누구" 탭으로 오랑이/붕쌤 전환.
- 이전 날짜 돌아가서 수정 가능 (날짜 선택기)
- 주간 요약: 최근 7일 체크율 표시 (예: "오랑이 엽산 7/7일 ✅, 철분 5/7일")

#### 7-3. 검사 결과 관리

**데이터 구조**:
```javascript
// master JSON에 추가
{
  ...,
  labResults: [
    {
      id: 1234567890,
      date: '2026-03-09',
      who: '붕쌤',
      type: 'semen',          // semen / blood / hormone / ultrasound / other
      values: {               // type별 다른 필드
        volume: 1.6,
        count: 62,
        motility: 61.1,
        morphology: 1
      },
      memo: '정상 범위이나 morphology 낮음',
      driveFileId: null       // Google Drive 파일 링크 (선택)
    }
  ]
}
```

**검사 종류별 입력 필드**:
- `semen`: volume(mL), count(M/mL), motility(%), morphology(%)
- `blood`: 자유 텍스트 또는 주요 수치 (Hb, WBC, PLT, AST, ALT 등)
- `hormone`: FSH, LH, E2, AMH, TSH, Prolactin 등
- `ultrasound`: 소견 텍스트
- `other`: 자유 텍스트

**파일 첨부**: 검사 기록에 Google Drive 파일 링크를 텍스트로 붙여넣기. (Drive에 직접 올린 후 공유 링크 복사 → 메모 또는 전용 필드에 입력)

**추세 차트**: 같은 type의 검사가 2회 이상이면 수치 변화 라인 차트 자동 표시.

#### 7-4. 프리컨셉션 체크리스트 (마일스톤)

**데이터 구조**:
```javascript
// master JSON에 추가
{
  ...,
  milestones: [
    { id: 1, who: '오랑이', label: '산부인과 preconception visit', done: false, doneDate: null },
    { id: 2, who: '오랑이', label: '풍진 항체 확인', done: false, doneDate: null },
    { id: 3, who: '오랑이', label: '갑상선 기능 검사', done: false, doneDate: null },
    { id: 4, who: '오랑이', label: '정신과 약물 정리 확인 (주치의)', done: false, doneDate: null },
    { id: 5, who: '오랑이', label: '편두통 약물 임신 중 사용 목록 확정', done: false, doneDate: null },
    { id: 6, who: '오랑이', label: '체중 목표 도달 (45kg+)', done: false, doneDate: null },
    { id: 7, who: '오랑이', label: '치과 검진', done: false, doneDate: null },
    { id: 8, who: '붕쌤', label: '정액검사', done: true, doneDate: '2026-03-09' },
    { id: 9, who: '붕쌤', label: '임신준비 영양제 시작', done: true, doneDate: '2026-03-18' },
    { id: 10, who: '붕쌤', label: 'Lithium 기형유발성 검토 (주치의)', done: false, doneDate: null },
    { id: 11, who: '붕쌤', label: 'ATX 감량 → 가임력 영향 평가', done: false, doneDate: null },
    { id: 12, who: '붕쌤', label: '금주 시작', done: false, doneDate: null },
    { id: 13, who: '공통', label: '유전 상담 (필요시)', done: false, doneDate: null },
    { id: 14, who: '공통', label: '보험/출산 준비 계획', done: false, doneDate: null },
  ]
}
```

**UI**: 체크리스트. 체크하면 doneDate 자동 기록. 진행률 프로그레스 바 (예: "8/14 완료 57%"). 사용자가 항목 추가/삭제 가능.

#### 7-5. 약물 안전 등급

교차 도메인에서 오랑이/붕쌤의 현재 복용 약물 목록을 가져와서, 각 약물의 임신 안전 등급 표시.

**내장 매핑**:
```javascript
const _PREGNANCY_SAFETY = {
  // FDA 구분 또는 호주 TGA 기준
  'Acetaminophen': { grade: 'B', note: '임신 전 기간 사용 가능, 1차 선택 진통제' },
  'Ibuprofen': { grade: 'D(3rd)', note: '3분기 금기, 1-2분기 단기 사용 가능' },
  'Loxoprofen': { grade: 'X(3rd)', note: '3분기 금기, 가급적 회피' },
  'Venlafaxine': { grade: 'C', note: '신생아 적응 증후군 위험, 이익-위험 평가 필요' },
  'Bupropion': { grade: 'C', note: '비교적 안전, 금연 목적 사용 데이터 있음' },
  'Lithium': { grade: 'D', note: 'Ebstein anomaly 위험, 임신 시 중단 또는 최소 용량' },
  'Atomoxetine': { grade: 'C', note: '동물실험 데이터만, 가급적 회피' },
  'Desvenlafaxine': { grade: 'C', note: 'Venlafaxine과 유사, 이익-위험 평가' },
  'Febuxostat': { grade: 'C', note: '임신 중 사용 데이터 제한적, 회피 권장' },
  'Metoclopramide': { grade: 'B', note: '임신 오심에 사용 가능' },
  'Propranolol': { grade: 'C', note: '편두통 예방, IUGR 위험 모니터링 필요' },
  // ... 확장 가능
};
```

**UI**: 카드 형태. 약물명 + 등급 뱃지 (A=초록, B=연두, C=노랑, D=주황, X=빨강) + 짧은 설명. 교차 도메인에서 자동 수집이므로 사용자 입력 불필요.

### 7-6. meds 뷰 분기

`renderMedsView()` 함수에서 `S.currentDomain === 'bungruki'`일 때 기존 질환 카드 대신 위 5개 섹션을 렌더하는 `renderBungrukiDashboard()` 함수 호출.

기존 질환 추가 기능은 유지하되, 대시보드 하단에 축소 배치.

### 7-7. 생리주기 → 편두통 교차 태그

기능 2 (트리거 기록)의 `getMenstrualTag()` 함수가 이 데이터를 참조:
```javascript
function getMenstrualTag() {
  var bds = S.domainState['bungruki'];
  if (!bds?.master?.menstrualCycles?.length) return null;
  var cycles = bds.master.menstrualCycles.sort((a,b) => b.startDate.localeCompare(a.startDate));
  var last = cycles[0];
  var today = kstToday();
  var diff = Math.round((new Date(today+'T00:00:00') - new Date(last.startDate+'T00:00:00')) / 86400000);
  if (diff >= 0 && diff <= 7) return '생리 D+' + diff;
  return null;
}
```

---

## 공통 작업

### APP_VERSION 업데이트

```javascript
const APP_VERSION = [
  {v:'v9.2', date:'2026-04-02', note:'처치효과회고 · 트리거칩 · 날씨자동수집 · 통계차트 · 경량모드 · ntfy경과알림 · 붕룩이대시보드'},
  // ... 기존 항목
].slice(0,5);
```

### CLAUDE.md 업데이트

자동완성 시스템 섹션에 트리거 관련 추가, 뷰 시스템에 경량 모드 설명 추가.

### HANDOFF.md 업데이트

"알려진 이슈 / 남은 작업"에서 "두통 경과 추적 시스템" 항목을 완료로 변경하고, v9.2 작업 내역 추가.

### 백업 자동화 (CLAUDE.md 절차대로)

1. `backup/v9.2` 브랜치 생성
2. 5개 초과 시 가장 오래된 백업 삭제
3. CLAUDE.md + HANDOFF.md 백업 목록 갱신

---

## 체크리스트 (구현 완료 후 검증)

### 기능 1~5 (기존)
- [ ] 편두통 로그 폼 열 때 미평가 회고 카드 표시됨
- [ ] 원탭 평가 → outcome 저장 → 카드 접힘
- [ ] 트리거 칩 선택 → 로그에 triggers 배열 저장됨
- [ ] 트리거 직접 입력 + 고정 동작
- [ ] 날씨 API 키 입력 후 기록 시 weather 자동 첨부
- [ ] stats 뷰에 새 차트 4종 표시
- [ ] 홈에서 "빠른 체크" → 1개 AI만 호출 → 응답 표시
- [ ] quick.html에도 회고 카드 + 트리거 칩 적용
- [ ] CSV 내보내기에 triggers 컬럼 포함
- [ ] editLogEntry에서 triggers, outcome 복원
- [ ] 기존 기능 깨짐 없음 (NRS 규칙, KST, esc 등)

### 기능 6: ntfy 경과 알림
- [ ] 설정에서 ntfy 토픽 입력 → GAS에 전달됨
- [ ] 두통 기록 저장 → 2시간 후 ntfy 푸시 도착
- [ ] 푸시 클릭 → quick.html 경과 입력 모드 열림
- [ ] 경과 입력 (rating + NRS + 메모) → outcome에 저장됨
- [ ] GAS 트리거 자동 삭제 (cleanup)

### 기능 7: 붕룩이 대시보드
- [ ] 붕룩이 도메인 meds 뷰 → 전용 대시보드 렌더됨
- [ ] 생리주기: 캘린더에 시작/끝 마킹 → 배란 추정일 자동 표시
- [ ] 일일체크: 오랑이/붕쌤 탭 → 체크 → Drive 저장
- [ ] 검사결과: type별 필드 입력 → 추세 차트
- [ ] 프리컨셉션: 체크리스트 토글 → 진행률 표시
- [ ] 약물안전: 교차 도메인 약물 → 등급 자동 표시
- [ ] 생리주기 → 편두통 트리거 교차 태그 동작

# HANDOFF — v9.7+ 세션 인수인계 가이드

## 현재 상태: v9.7+ (main)
- 브랜치: main (PR #167 squash 머지 완료)
- SW CACHE_NAME: v98z
- APP_VERSION: v9.7
- backup/v9.7 브랜치 유지

## 이번 세션 완료 (2026-04-13)

### 비용 추적 누락 수정 (핵심)
- **bungruki.js:595,607** — 생리주기 사진 OCR (Claude/GPT Vision) `recordUsage` 추가
- **conditions.js:862,874** — 약물 사진 인식 (Claude/GPT Vision) `recordUsage` 추가
- 이 3곳이 `fetchWithRetry`로 직접 API 호출하면서 비용 추적을 빠뜨리고 있었음
- 특히 Vision 호출은 이미지 토큰이 커서 비용 차이가 큼

### recordUsage 상세 추적 시스템 (신규)
- **cost.js**: `recordUsage(aiId, model, inT, outT, source)` — 5번째 인자 `source` 추가
- 개별 호출 기록 `calls` 배열 추가:
```javascript
usage_data[date][aiId] = {
  in, out, cost, model,  // 기존 합산 (호환성 유지)
  calls: [
    {time:"14:30", model:"claude-sonnet-4-6", in:8000, out:3000, cost:0.07, source:"session-r1"},
    {time:"15:10", model:"claude-haiku-4-5", in:40000, out:15000, cost:0.12, source:"photo-ocr"},
  ]
}
```
- source 값: `session-r1~r3`, `summary`, `photo-ocr`, `drug-photo`, `lab-normalize`, `drug-safety`, `drug-search`, `drug-normalize`, `checkup-interpret`, `checkup-merge`, `drug-alert`, `insight`, `daily-insight`, `monthly-insight`, `forecast`
- **ai-api.js**: `callAI(aiId, system, user, source)`, `callAIStream(..., source)` — source 파라미터 전파
- **모든 AI 호출 18곳**에 source 태깅 완료 (10개 파일)

### 비용 페이지 breakdown UI (views.js)
- `_renderUsageCallsBreakdown(monthStr)` 함수 추가
- **기능별 비용**: source별 그룹 (세션R1/요약/사진OCR/검사표준화 등)
- **모델별 비용**: 모델별 호출수/토큰/비용
- **최근 호출 로그**: 시간순 최근 20건 (날짜, 시간, 모델, source, 토큰, 비용)

### AI 호출 진행도 개선 (session.js)
- `startAITimer`: 모델명 + 예상 금액/call 표시 (예: `5s · ~$0.0420/call`)
- `DEFAULT_PRICE_TABLE`에서 현재 모델 가격으로 추정 계산

### 교차 도메인 메모 표시 개선 (log.js)
- **편두통 도메인**: 마음관리/건강관리 최근 3일 메모 전문 표시 (기존: 오늘만, 80자 잘림)
- **건강관리 도메인**: 교차 메모 7일, 14건으로 확대 (기존: 10건, 80자 잘림)
- 도메인별 색상 테두리 + 배경색으로 구분
- dailyChecks(수면/에너지 등) 정보도 함께 표시

### 검사 아카이브 기관별 뷰 (checkup.js)
- `_renderCheckupByInstitution(checkups)` 함수 추가
- **🏥 기관별** 탭 신설 (타임라인/추세/카테고리 옆)
- 기관별 그룹핑 → 대분류(🩸혈액/🧪소변/🛡️감염/🎯암/🧬생식/📋기타)별 정리
- 항목별 날짜 매트릭스: 같은 항목의 날짜별 수치를 한눈에
- 이상/정상 상태 아이콘 + 색상 표시

### GPT 가격 테이블 검증 (constants.js)
- `gpt-5.4` $2.50/$15.00 — 확인 (정확함)
- 누락 모델 3개 추가: `gpt-4.1-nano` $0.05/$0.20, `gpt-4o` $2.50/$10.00, `gpt-4o-mini` $0.15/$0.60
- **GPT 과다 추정 원인**: 가격표 자체는 정확. 실제 $0.42 vs 추정 $1.24 차이는 사용 모델이 다를 가능성 → OpenAI 콘솔에서 실제 호출 모델 확인 필요

### 실제 API 사용량 분석 (4월 스크린샷 기준)
| Provider | 실제 비용 | 주요 모델 |
|----------|----------|----------|
| Claude | $4.10 | sonnet-4-6: 481K in/173K out, haiku-4-5: 28K in/5K out |
| OpenAI | $0.41 | Default project, 95K tokens |
| Gemini | ₩12,800 | Orangi Migraine 프로젝트 |
| Perplexity | $4.79 (3-4월) | sonar-pro, sonar, sonar-deep-research |
| xAI (Grok) | 미확인 | 모델 목록/가격만 확인 |

## 이전 세션 완료 (2026-04-11)

### 통합 기록 폼 (Unified Form)
- 다른 도메인 빠른 기록 섹션: 아코디언 방식으로 접기/펼치기
- 각 섹션: 기분 칩/증상/투약 체크/카테고리/컨디션 점수 등 도메인별 핵심 입력
- 저장 시 현재 도메인 + 다른 도메인에 입력한 데이터 동시 저장

### 통계 대시보드 재설계
- 건강관리 도메인 전용 차트 (체중/운동/영양제/음주)
- 피어슨 상관계수 기반 도메인 간 상관분석

### 타임라인/캘린더/검진/AI해석 등
- (상세는 이전 HANDOFF 참조)

## 다음 세션 TODO

### 비용 추적 후속
- [ ] 1~2주 사용 후 calls 배열 데이터로 추정 vs 실제 재비교
- [ ] OpenAI 콘솔에서 실제 호출 모델 확인 (gpt-5.4 vs 다른 모델?)
- [ ] Gemini/Perplexity 비용도 앱 내 추적과 대조

### 검사항목 정리 후속
- [ ] 미분류 항목(other) 비율 줄이기 — AI 재분류 + 사전 확장
- [ ] 검사항목 큰 분류(CBC/UA/STD) 중복 정리 자동화

### 통합 폼 개선
- [ ] 통합 폼 편집 모드 지원
- [ ] 통합 폼 auto-save/restore
- [ ] 붕룩이 축약 섹션도 통합 폼에 추가

### 기존 미완료
- [ ] AI 건강 인사이트 (검진+약물+운동+체중 종합)
- [ ] 붕룩이 통계 관계/가임기 분석 강화

## 주의사항
- sw.js CACHE_NAME 현재 **v98z** — 코드 변경 배포 시 반드시 올릴 것
- 검사 정규화: **AI-first** (AI 추출+분류+판정 → 사전 교차검증)
- NRS 표시: 반드시 `_scoreLabel()` 사용
- **recordUsage source**: 새 AI 호출 추가 시 반드시 source 파라미터 포함 (CLAUDE.md 규칙 #36)
- patches/ 폴더가 브랜치에 남아있음 — main 머지 시 자동 포함됨, 정리 필요하면 삭제

## 새 채팅 시작 시
```
CLAUDE.md와 HANDOFF.md 읽고 이어서 작업해줘.
```

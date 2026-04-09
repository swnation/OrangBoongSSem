# HANDOFF — v9.7 세션 인수인계 가이드

## 현재 상태: v9.7+ (main 최신)
- 브랜치: main
- SW CACHE_NAME: v97z24
- APP_VERSION: v9.7
- backup/v9.7 브랜치 유지
- PR #163 (검사결과탭 수정), #164 (워터폴+약물안전), #165 (리뷰용) 머지 완료

## 이번 세션 완료 (2026-04-09)

### 버그 수정
- 검사결과 탭 무반응: `estimateConceptionRate`의 `!!hv` → `!!hormoneLabs.length` (ReferenceError)
- 임신준비 통계 탭 무반응: 같은 `estimateConceptionRate` 함수 크래시
- 관계 탭 무반응: `kstTimeStr()` → `kstTime()` 미정의 함수 수정
- meds 뷰 try-catch 추가 (`_renderMedsSafe` 헬퍼) — 에러 시 화면에 표시
- 약품 성분명 정규식: `산$`/`염` 제거 → 엽산 등 오처리 방지 (Gemini #164 반영)
- 정규식 `/g` 플래그 불필요 제거 (Gemini #165 반영)
- ntfy 경과 알림: `?delay=` 파라미터 위치 변경 + 서버 실패 시 폴백 발송

### 신규 기능
- **임신확률 모델 차이 해석 + 워터폴 차트**
  - 모델 배치: 연령 기저율 → TMSC → 종합(WHO)
  - 모델 간 차이 해석 메시지 (종합 vs TMSC 비교)
  - 워터폴: 요인별 누적 감소 시각화 (before→after %p)
  - solo 확률: 해당 항목만 반영 시 확률

- **약물안전 탭 전면 개선**
  - 오랑이/붕쌤 유저별 섹션 분리
  - 한국 약품명 정규화: `_extractDrugCandidates()` (제형/용량/성분명 파싱)
  - 시술/설명 필터링: `_isDrugNotTreatment()`
  - 붕쌤: 🧬 남성 가임력 메인 + PLLR 표시 + FDA 접기
  - `_MALE_FERTILITY_IMPACT` DB 24개 약물 (수치/메커니즘/회복기간/대안/참고문헌)
  - 오랑이: FDA 위험도 순 / 붕쌤: 가임력 영향 순 정렬

- **영양제 숨김 기능**
  - 모든 항목에 ✕ 숨기기 + ↩ 복원 버튼
  - `hiddenSuppl` 클라우드(마스터 JSON) 저장

- **붕쌤 질환별 복용 순응도**
  - ⚙️ 질환 선택: 붕쌤의 모든 도메인 활성 질환 표시
  - 매일/PRN 약물 체크박스 + `dailyChecks[date].bung.mc` 저장
  - 📊 종합 순응도 (7일): 약물 + 💊 영양제 + 🏃 운동

- **캘린더 → 데일리체크 연결**
  - 날짜 클릭 시 해당 날짜 데일리체크 탭으로 이동
  - 캘린더에 복용 순응도 🏥 아이콘 표시

- **AI 약물 검색 개선**
  - 프롬프트: 약물/비약물 구분 + 영문 성분명 명시 + 출처 표기
  - 추출 정규식 + 70개 stopWords 필터

- **약물 칩 PRN 토글**
  - 각 약물 칩에 [PRN/매일] 토글 버튼 추가

### Gemini 리뷰 반영
- #164: 약품명 정규식 `산$` 제거
- #165: try-catch 헬퍼, break 주석, `/g` 제거, 색상 객체 맵

## 다음 세션 TODO

### 🔥 건강 검진 PDF 아카이브 (신규 — 큰 기능)
- [ ] 건강관리 도메인에 "📋 검사 아카이브" 섹션 추가
- [ ] PDF/이미지 업로드 → AI Vision으로 검사 수치 추출
- [ ] 원본 파일 Google Drive 폴더에 보관 (파일 ID 링크)
- [ ] 추출된 수치는 마스터 JSON `healthArchive` 배열에 구조화 저장
  - 카테고리: 혈액검사/소변검사/영상/기타
  - 항목별: {name, value, unit, ref, date, category}
- [ ] 시계열 추세: 같은 항목 여러 번 → 추세 차트 + 이상치 감지
- [ ] 도메인 간 공유: 건강관리에 저장 + 붕룩이에서 참조 (임신 관련 수치: AMH, FSH, TSH 등)
- [ ] AI 컨텍스트 자동 포함: 세션 시작 시 최근 검사 결과 요약 주입
- [ ] 다중 페이지 PDF 지원 (페이지별 Vision 분석)
- [ ] 검사 기관명/날짜 자동 추출
- [ ] 이전 결과와 자동 비교 (개선/악화 표시)

### 기존 미완료
- [ ] 검사결과 ref 없는 기존 데이터에 일반 참고치 일괄 적용
- [ ] medCheck 마이그레이션 — 전체 월 스캔
- [ ] 관계 기록 빈도 통계 + 가임기 적중률 차트
- [ ] 붕룩이 통계에 관계/가임기 분석 포함
- [ ] AI 요약 결과 마스터에 저장 (히스토리)
- [ ] 홈 대시보드 카드 드래그 정렬

## 주의사항
- sw.js CACHE_NAME 현재 **v97z24**
- 검사결과 값 접근 시 **반드시 부분 매칭** (단위 포함 키 대응)
- ntfy 경과/약물 알림: 서버사이드 `?delay=Xm` + 폴백 (`sendOutcomeNtfy`)
- Vision AI 호출 시 반드시 `recordUsage` 포함
- 예방접종 변경 시 건강관리↔붕룩이 양쪽 반영
- 약물안전 탭: `_extractDrugCandidates` + `_isDrugNotTreatment` 정규화
- 남성 가임력 DB: `_MALE_FERTILITY_IMPACT` (bungruki.js 상단)
- 복용 순응도: `dailyChecks[date].bung.mc` 객체, `medComplianceConfig.tracked` 설정
- 관계 탭 무반응 원인이 아직 불확실 — kstTime() 수정 + try-catch 추가는 했으나 사용자 재확인 필요
- review/pre-batch 브랜치 정리 필요 (리뷰용, 삭제 가능)

## 새 채팅 시작 시
```
CLAUDE.md와 HANDOFF.md 읽고 이어서 작업해줘.
```

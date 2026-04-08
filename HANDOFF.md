# HANDOFF — v9.7 세션 이어받기 가이드

## 현재 상태: v9.7 준비 중 (버전업 아직 안 함)
- 브랜치: main (최신), review/v9.7 (PR #162 오픈)
- SW CACHE_NAME: v97p
- APP_VERSION: v9.6 (v9.7로 올려야 함)

## 이번 세션 완료 (v9.6 → v9.7 예정)

### 붕쌤 데일리체크 (bung/index.html) — 신규
- Google OAuth + Drive 직접 접근 (메인앱 동일 CLIENT_ID)
- 3도메인(마음관리/건강관리/임신준비) 약물 통합 체크
- 다중 월 로그 캐시 (ds.logs[month])
- NRS 0-10 + dailyChecks(기분 1-5) + 증상 칩
- 전체선택/해제, 시간입력/스킵, 다중기록(수정/추가), 삭제
- 일괄입력: 조건단위 토글 + getMedsAtDate 날짜별 약물이력 자동매핑
- 🔄 새로고침 (캐시 클리어 + Drive 재로드)

### 메인앱 캘린더 (js/views.js)
- renderMedComplianceCalendar 전면 재작성
- medCheck + meds[] 통합 읽기 + 클릭 상세(약물별 ✅/❌)
- 기존 투약 기록 → 캘린더 반영 버튼 (_syncMedsToMedCheck)
- trackCompliance 날짜 기반 필터 (_isTrackActive)

### 순응도 추적 (js/conditions.js)
- condition.trackCompliance = [{med, until:'change'|'YYYY-MM-DD'}]
- 질환 편집에서 약물별 📊추적 토글 + 기간 설정
- until 만료 → 순응도 계산에서 자동 제외

### undo/redo + timeline 병합 (js/log.js)
- _pushUndo: logData 스냅샷 (최대 10건)
- 삭제/병합 시 자동 undo 포인트
- 병합 → timeline[] 완전 보존 + nrsRange:{min,max}
- 전후비교 모달 + timeline 상세 뷰어

### 건강관리/마음관리 NRS
- moodMode: 기분 이모지 + 컨디션 점수 0-10 슬라이더 병행
- 저널모드: NRS 슬라이더 + medCheck 자동 포함

### 사이드바
- 두통빠른기록/데일리체크 바로가기
- 로그아웃(signOut) + 자동로그인 토글

### 임신준비 (js/bungruki.js)
- _normalizeSemenValues: AI 키명 → 표준 키 자동 변환
- 붕룩이 통계 전용 화면 (_renderBungrukiStats)
- 임신확률 모델 설명 (WHO/TMSC/연령 클릭 → 상세)
- 확률 향상 팁 + "잘 하고 있어요" 자동 체크
- 검사결과: 원본이미지 보기 + 수치수정 + 재분석(Gemini→GPT→Claude)
- 영양제 추가/삭제, who 태그, 캘린더 오랑이/붕쌤 필터

### 공유 프로필 진단 분리
- USER_PROFILES에서 diagnoses 제거 → 기본 정보만
- getConditionsContext() 전체 유저 도메인 통합

### 기타
- bungruki.js 구문오류 수정 (중복 return)
- CLAUDE.md: SW 캐시명 업데이트 규칙 (#14)

## 다음 세션 TODO (합의됨)

### 그룹 1: 데이터 무결성
- [ ] 데일리체크↔메인앱 양방향 자동 동기화 (polling)
- [ ] 기존 로그 medCheck 키 정규화 마이그레이션 유틸

### 그룹 2: 임신준비
- [ ] 관계 기록 ↔ 가임기 자동 매칭/오버레이
- [ ] 정액검사 재검 시 이전 결과 자동 비교 차트

### 그룹 3: AI 활용
- [ ] timeline 기반 일일 AI 자동 요약
- [ ] 월간 패턴 AI 인사이트 (과도 해석 주의 — 월간만)
- [ ] 검사결과 OCR 추출 실패 항목 선택적 재분석

### 그룹 4: UX
- [ ] 오프라인 데일리체크 (localStorage 임시저장 → 온라인 시 동기화)
- [ ] 홈 대시보드 카드 선택/정렬 커스텀

### 그룹 5: 버전업
- [ ] v9.7 APP_VERSION 추가 + backup/v9.7 브랜치 생성
- [ ] 백업 자동화 절차 (CLAUDE.md 참조)

## 주의사항
- PR은 큰 변화마다 만들어서 Gemini 리뷰 받기
- 코드 변경 시 sw.js CACHE_NAME 반드시 올리기 (현재 v97p)
- undo/redo: 요약/병합 등 데이터 변경 기능에는 항상 _pushUndo 호출
- medCheck 저장: replace (merge 아님) — 키 불일치 방지

## 15개 JS 모듈 + 독립 페이지
| 파일 | 역할 |
|------|------|
| constants.js | 상수 (DOMAINS, AI, APP_VERSION, USER_PROFILES, PRICE_TABLE) |
| state.js | 전역 상태 S 객체 |
| utils.js | 유틸리티 (esc, kstToday, 모달, 토스트) |
| crypto.js | API 키 AES-256-GCM 암호화 |
| drive.js | Google Drive + OAuth + 자동로그인 + signOut |
| cost.js | 비용 추적 (전체 도메인 합산) |
| ai-api.js | 5개 AI SSE 스트리밍 + 공유 프로필 컨텍스트 |
| session.js | 세션/디베이트/요약 |
| head-diagram.js | SVG 머리 다이어그램 |
| log.js | 증상 기록 + medCheck + undo/redo + timeline 병합 |
| conditions.js | 질환관리 + trackCompliance + 약물변경이력 |
| bungruki.js | 임신 준비 대시보드 + 검사결과 + 확률 |
| settings.js | API 키 + 모델 선택 + 컨텍스트 편집 |
| pwa.js | PWA + 알림 + SW 업데이트 |
| views.js | 뷰 렌더링 + 캘린더 + 붕룩이 통계 |
| bung/index.html | 붕쌤 데일리체크 (독립 페이지) |
| quick/index.html | 두통 빠른 기록 (독립 페이지) |

## 새 채팅 시작 시
```
CLAUDE.md와 HANDOFF.md 읽고 이어서 작업해줘.
```

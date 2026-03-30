# HANDOFF — v9.0 세션 이어받기 가이드

## 브랜치
`claude/continue-v9-features-9gma4`

## 현재 상태: v9.0 전체 완료 + 추가 기능 다수

### 완료된 작업 (이번 세션)
- [x] v9.0 HANDOFF 20개 기능 전부 구현
- [x] 약물 효과 추적 / 패턴 감지 경고 / 월간 PDF / AI 질문 추천
- [x] PWA 푸시 알림 (브라우저 — 앱 열려있을 때)
- [x] Gmail 이메일 알림 (Apps Script — 앱 닫혀있어도 즉시)
- [x] 두통 부위명 변경 (미간/이마/눈썹부위/관자놀이/후두부)
- [x] 인터랙티브 SVG 머리 그림 (양쪽 사이트)
- [x] 통증 종류 7가지 + 직접 입력
- [x] quick.html → /quick/ 별도 경로 분리
- [x] 클라우드 우선 아키텍처 (localStorage 의존 최소화)
- [x] 선택/전체 반영·삭제 UI
- [x] 반영된 기록 읽기 전용 (탭하면 상세 보기)
- [x] 주간 요약: 시간대별 펼침 + NRS 라인 그래프
- [x] Google Drive 코드 백업 (버전 업 시 자동)
- [x] PWA 아이콘 (메인 파랑/두통 주황)
- [x] 사이드바 z-index 수정
- [x] sendLogNotification 함수 누락 수정 (치명적)
- [x] Gemini 코드 리뷰 반영 (PR#31, #32, #33)

### 주요 아키텍처 결정
- **클라우드 우선**: quick.html 데이터는 Apps Script가 진실, localStorage는 캐시
- **알림**: Gmail 이메일 (OrangBoongSSem@gmail.com) — 앱 상태 무관 즉시 알림
- **두통 부위**: 미간=내측눈썹(오랑이 표현), 이마=외측이마(기존 미간), 눈썹부위=눈썹뼈
- **카톡 불가**: 사업자등록 필요 → Gmail 알림으로 대체
- **PWA 분리 불가**: 같은 도메인이라 메인만 PWA, quick은 바로가기
- **코드 백업**: 버전 업 시 codeBackupToDrive() 자동 실행 → Google Drive

### Apps Script 현황
- URL: https://script.google.com/macros/s/AKfycbzYF46qeLJRGIQsqfXbic6ITRGKr1eA9chrVJ8Fu5_gM7TDSYUFlpaWQGmSR9RdAACjzw/exec
- 기능: save / markSynced / replaceAll / delete + 이메일 알림 + 7일 자동 삭제
- 알림 대상: OrangBoongSSem@gmail.com

### PR 워크플로우
1. PR 생성 → 바로 머지 (대기 없음)
2. 다음 작업 시 이전 PR의 Gemini 리뷰 확인 (get_review_comments)
3. 반영할 것 있으면 다음 커밋에 포함

### 백업 브랜치
```
backup/v9.0  ← 현재 버전
backup/v8.4  ← 디베이트/빠른질문/인사이트
backup/v8.3  ← KST/한영매핑/PDF/캘린더
backup/v8.2  ← 질환 관리/ICD-10/질환별 투약
backup/v8.1  ← UX 개선/직접입력/자동완성
```

### 알려진 이슈 / 남은 작업
- 머리 그림 SVG를 더 리얼하게 (사용자 피드백: "그림판 같다")
- 메인 사이트 통증 종류에 직접 입력 기능 추가됨 (확인 필요)
- PWA 아이콘: 코드로 생성한 PNG (예쁘지 않을 수 있음)

## 새 채팅 시작 시
```
CLAUDE.md와 HANDOFF.md 읽고 이어서 작업해줘.
브랜치: claude/continue-v9-features-9gma4

PR 머지 후 Gemini 봇 리뷰를 확인하고 반영해줘.
이전 PR의 미반영 리뷰가 있으면 먼저 처리해줘.
```

# Orangi Health AI 협진 시스템 — 버전 정보

## 현재 버전: v8.3 (2026-03-29)

### 파일 구조
```
index.html      — HTML + JS (메인 앱, ~4200줄)
style.css       — CSS (325줄)
manifest.json   — PWA 매니페스트
sw.js           — Service Worker (오프라인 캐시)
VERSION.md      — 이 파일
```

### 주요 기능
- 4개 AI 동시 협진 (GPT/Claude/Gemini/Perplexity) — SSE 스트리밍
- Google Drive 클라우드 동기화
- 6개 도메인: 편두통/마음관리/건강관리(오랑이·붕쌤)/임신준비
- 증상 기록 + 30일 통계 + 90일 NRS 캘린더 히트맵
- 유저별 통합 질환 관리 (ICD-10 기반 자동완성)
- 질환별 투약 관리 (식약처 API + 내장 310쌍 한영 매핑)
- 교차 도메인 로그 분석
- 반복 시술 주기 추적
- 세션 검색/필터 + PDF 리포트
- PWA 오프라인 지원
- KST 타임존 통일

### 백업 브랜치
| 브랜치 | 버전 | 설명 |
|--------|------|------|
| `backup/v8.3` | v8.3 | KST/한영매핑/PDF/캘린더/시술추적 |
| `backup/v8.2` | v8.2 | 질환 관리 통합/ICD-10/질환별 투약 |
| `backup/v8.1` | v8.1 | UX 개선/직접입력/자동완성/컨텍스트통합 |
| `backup/v8.0` | v8.0 | 스트리밍/통계/PWA/파일분리 |
| `backup/v7.6` | v7.6 | 초기 안정 버전 |

### 이전 버전 복원 방법
```bash
# 1. 백업 목록 확인
git branch -l backup/*

# 2. 원하는 버전으로 되돌리기
git checkout -B main backup/v8.2
git push -f origin main
```

### 외부 의존성
- Google GSI (OAuth)
- marked.js v15 (마크다운 렌더링)
- DOMPurify v3 (XSS 방어)
- 식약처 API (의약품 검색, API 키 필요)

### API 키
- Google OAuth Client ID: `103056429713-...` (코드 내장)
- 식약처 공공데이터: `e2e1a2277c...` (코드 내장)
- AI API 키: 사용자가 앱 내에서 직접 입력 (localStorage 저장)

# 아기 수유 트래커 MVP

로그인 없이 누구나 입력/조회 가능한 공유형 아기 수유 기록 앱입니다.

## 기능

- 모유/분유 탭 분리
- 모유: 왼쪽/오른쪽 시간 5분 단위 입력
- 분유: 총량 10ml 단위 입력
- 모유는 `1분당 ml` 기준으로 총량 자동 환산
- 기준값(`1분당 ml`)은 UI에서 즉시 변경 가능
- 오늘 총 섭취량/횟수 계산
- 최근 7일 총량 시각화
- 최근 기록 목록 표시
- 별도 기록/통계 페이지(`/history`)에서 달력 날짜 선택 기반 기록/통계 조회
- Supabase에 저장되어 모든 사용자가 공유 데이터 조회

## 기술 스택

- Next.js 14 (App Router)
- Supabase (BaaS)
- Vercel 배포

## 로컬 실행

1. 의존성 설치

```bash
npm install
```

2. 환경 변수 설정

```bash
cp .env.example .env.local
```

`.env.local`에 Supabase 값 입력:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. Supabase SQL Editor에서 `supabase/schema.sql` 실행

4. 개발 서버 실행

```bash
npm run dev
```

## Vercel 배포

1. Git 저장소를 Vercel에 연결
2. Project Settings > Environment Variables에 아래 추가
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. 배포

## 주의사항 (MVP)

- 로그인 없는 공개 쓰기 정책이라 누구나 데이터 입력/수정 가능
- 운영 전에는 인증/권한/RLS 정책 강화 필요

# AdMate Foresight Design Notes

작성일: 2026-05-21

## Typography

AdMate의 모든 페이지 기본 UI 폰트는 Geist를 사용한다.

기본 sans-serif 스택은 다음 순서를 따른다.

```css
Geist, Geist Fallback, Noto Sans KR, system sans-serif
```

Next.js App Router 프로젝트에서는 구조상 자연스러운 경우 `next/font/google`의 `Geist`를 사용해 앱 루트에서 전역 로드하고, CSS의 기본 `font-family` 토큰이 위 fallback 순서를 유지하도록 한다.

## Foresight Accent

Foresight의 로그인 액션 패널 top border는 예측/분석 톤의 `#315A8C`를 사용한다. 이 색은 Sentinel green, Compass amber/green, Lens clay와 겹치지 않는 Foresight 기준선/분석 신호로 취급한다.

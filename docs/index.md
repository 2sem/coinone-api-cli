---
layout: home

hero:
  name: coinone-api-cli
  text: 코인원 CLI 문서
  tagline: 코인원 공개 API와 제한된 개인 API 워크플로를 다루는 작고 실용적인 Node.js CLI입니다.
  actions:
    - theme: brand
      text: 시작하기
      link: /install
    - theme: alt
      text: 명령어 레퍼런스
      link: /command-reference

features:
  - title: 자동화 친화적
    details: 안정적인 JSON 출력, 명확한 help 텍스트, 예측 가능한 명령 구조를 제공합니다.
  - title: 더 안전한 개인 API 흐름
    details: 개인 명령어는 비밀값을 그대로 출력하지 않으며, 주문 실행에는 명시적 확인 플래그가 필요합니다.
  - title: 작고 익숙한 사용성
    details: gh, httpie, stripe 같은 CLI 사용성을 참고하면서 의존성은 최소화했습니다.
---

## 이 CLI로 할 수 있는 일

- 공개 시세 조회: markets, currencies, ticker, orderbook, trades, range units
- 개인 조회 작업: auth status, balances, fees, 주문 조회, 주문 이력 확인
- 보호된 주문 작업: 명시적 안전 플래그가 필요한 주문 생성 및 취소

## 기본 사용 흐름

```mermaid
flowchart TD
  A[coinone-api-cli 설치] --> B[coinone --help 실행]
  B --> C{개인 명령어가 필요한가?}
  C -- 아니오 --> D[공개 시세 명령어 사용]
  C -- 예 --> E[COINONE_ACCESS_TOKEN / COINONE_SECRET_KEY 설정]
  E --> F[coinone doctor 실행]
  F --> G[auth, balance, fee, order 명령 실행]
  G --> H[실주문 전에는 --dry-run 우선 사용]
```

## 먼저 읽으면 좋은 문서

- [설치](./install): npm, Homebrew, Git 설치와 로컬 개발 경로
- [빠른 시작](./quickstart): 바로 복사해서 실행할 수 있는 예시
- [명령어 개요](./commands): 주요 명령 그룹과 주의할 동작 정리
- [명령어 레퍼런스](./command-reference): 실제 CLI 명령 트리에서 자동 생성된 문서
- [인증과 안전장치](./auth-and-safety): 환경 변수 설정, 서명 방식, 실주문 안전장치
- [출력과 자동화](./output-and-automation): `--json`, `--output raw`, timeout, 쉘 자동화 패턴
- [문제 해결](./troubleshooting): 설치, PATH, 인증, 검증 실패 대응 팁

## 로컬 문서 명령어

```bash
npm install
npm run docs:dev
npm run docs:build
npm run docs:preview
```

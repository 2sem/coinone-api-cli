# 문제 해결

## 설치는 되었는데 `coinone` 명령을 찾지 못할 때

`npm install -g`는 성공했는데 `coinone`을 찾지 못한다면, 보통 패키지 자체보다 셸 환경 설정 문제가 원인입니다.

- npm 전역 bin 디렉터리는 환경마다 다르며 `PATH`에 아직 없을 수 있습니다
- Git 기반 전역 설치도 결국 로컬 Node.js와 npm 전역 bin 설정에 의존합니다
- 셸 프로필을 바꾼 뒤에는 새 셸 세션을 열어야 반영될 수 있습니다

확인해볼 명령:

```bash
npm bin -g
npm prefix -g
coinone doctor
coinone doctor --json
```

`npm install -g` 이후에도 명령이 없다면, `npm bin -g` 결과와 현재 `PATH`를 비교해서 필요한 경우 셸 프로필에 추가하세요.

## 인증 오류

- 현재 셸에 `COINONE_ACCESS_TOKEN`과 `COINONE_SECRET_KEY`가 export 되었는지 확인하세요
- 개인 명령어 실행 전 `coinone doctor`를 먼저 실행하세요
- `coinone auth status`는 로컬 환경 변수만 검증한다는 점을 기억하세요

## 주문 검증 실패

`orders place`는 dry-run 성공을 반환하거나 실주문을 보내기 전에 시장 사전 검증을 수행합니다. 아래와 같은 잘못된 지정가 주문은 즉시 실패합니다.

- below-minimum order notional (`price * qty < min_order_amount`)
- unsupported order type for the pair
- trading disabled or maintenance-active markets
- price and quantity outside Coinone min/max bounds

## 같이 확인하면 좋은 명령 조합

```bash
coinone doctor --json
coinone auth status
coinone markets get btc --quote krw --json
coinone orders place --quote krw --target btc --side buy --type limit --price 1000 --qty 0.01 --dry-run
```

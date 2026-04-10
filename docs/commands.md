# 명령어 개요

실제 CLI 구조를 그대로 반영한 문서는 [명령어 레퍼런스](./command-reference)를 확인하세요. 이 페이지는 사람이 빠르게 훑어보기 좋은 요약 문서입니다.

## 전역 옵션

- `--json`: 스크립트와 에이전트를 위한 정규화된 JSON 출력
- `--output <mode>`: `table`, `json`, `raw` 중 선택
- `--base-url <url>`: 프록시, mock 서버, 대체 Coinone 호환 호스트 지정
- `--timeout <ms>`: 모든 API 호출에 적용할 요청 timeout 지정
- `--color`: 오류 출력에 컬러 강제 적용

## 명령 그룹

### 공개 명령어

```text
coinone markets list
coinone markets get <targetCurrency> --quote <quoteCurrency>
coinone currencies list
coinone currencies get <currency>
coinone ticker get <targetCurrency> --quote <quoteCurrency>
coinone ticker list [--quote <quoteCurrency>]
coinone orderbook get <targetCurrency> --quote <quoteCurrency> [--size <n>]
coinone trades list <targetCurrency> --quote <quoteCurrency> [--size <n>]
coinone range-units get <targetCurrency> --quote <quoteCurrency>
```

### 개인 조회 명령어

```text
coinone doctor
coinone auth status
coinone balances list
coinone balances get <currency>
coinone fees list
coinone fees get --quote <quoteCurrency> --target <targetCurrency>
coinone orders active [--quote <quoteCurrency>] [--target <targetCurrency>] [--type <type>]
coinone orders get <orderId> --quote <quoteCurrency> --target <targetCurrency> [--user-order-id <id>]
coinone orders completed --from <timestamp-ms|iso> --to <timestamp-ms|iso> [--size <1-100>] [--to-trade-id <id>] [--quote <quoteCurrency> --target <targetCurrency>]
```

### 개인 쓰기 명령어

```text
coinone orders place --quote <quoteCurrency> --target <targetCurrency> --side <buy|sell> --type limit --price <string> --qty <string> [--post-only] [--user-order-id <id>] (--dry-run | --confirm live)
coinone orders cancel --order-id <id> --quote <quoteCurrency> --target <targetCurrency> [--user-order-id <id>] --confirm live
```

## 검증 규칙 메모

- `orderbook get --size`: one of `5`, `10`, `15`, `16`
- `trades list --size`: one of `10`, `50`, `100`, `150`, `200`
- `orders completed --from/--to`: UTC millisecond timestamps or ISO-8601 values
- `orders completed`: max time window is `90` days and `--quote`/`--target` must be passed together
- `orders place`: only `--type limit` is supported in the MVP
- `orders place`: exactly one of `--dry-run` or `--confirm live` is required
- `orders cancel`: `--confirm live` is always required in the MVP

## 알아두면 좋은 동작

- `markets list`는 공개 API 경로에 quote currency가 필요하지만 CLI 형태에서는 생략되어 있으므로 기본값으로 `KRW`를 사용합니다
- `ticker list`도 `--quote`가 없으면 기본값으로 `KRW`를 사용합니다
- 개인 명령어는 인증 환경 변수가 없으면 즉시 non-zero exit로 실패합니다

## 예시

```bash
coinone doctor
coinone markets list
coinone balances list --json
coinone fees get --quote krw --target btc
coinone orders active --quote krw --target btc --type limit
coinone orders get 12345 --quote krw --target btc
coinone orders completed --from 2026-01-01T00:00:00Z --to 2026-01-07T00:00:00Z
coinone --timeout 15000 ticker get btc --quote krw --json
coinone ticker list --quote krw
coinone trades list btc --quote krw --size 50 --output raw
```

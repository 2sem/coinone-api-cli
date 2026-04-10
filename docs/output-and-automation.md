# 출력과 자동화

자동화나 에이전트 연동이 목적이라면 사람이 읽기 좋은 기본 출력보다 `--json`과 timeout 제어를 우선적으로 고려하는 것이 좋습니다.

## 출력 모드

- 기본값: 간결한 표 또는 요약 뷰
- `--json`: 자동화를 위한 정규화된 JSON
- `--output json`: `--json`과 동일
- `--output raw`: Coinone API 원본 응답을 보기 좋게 출력

## 자동화 권장 사항

- 안정적인 기계 판독 출력을 위해 `--json`을 우선 사용하세요
- CI나 에이전트 루프에서는 `--timeout <ms>`로 느린 요청을 빠르게 실패 처리하세요
- mock API, replay 서버, 로컬 통합 테스트에는 `--base-url <url>`을 사용하세요
- 개인 인증 정보는 inline 플래그나 프롬프트 대신 환경 변수로 관리하세요
- npm 패키지 운영 계획이 없다면 팀 공유용 설치는 Git 기반 설치가 더 단순할 수 있습니다

## 예시

```bash
coinone doctor --json
coinone --json currencies list
coinone --json balances get btc
coinone --json orders completed --from 2026-01-01T00:00:00Z --to 2026-01-02T00:00:00Z --quote krw --target btc
```

```bash
market_json=$(coinone --json markets get btc --quote krw)
price_unit=$(printf '%s' "$market_json" | jq -r '.priceUnit')
echo "$price_unit"
```

```bash
coinone --base-url http://127.0.0.1:4010 --json markets get btc --quote krw
coinone --output raw ticker get btc --quote krw
coinone --json orders active --quote krw --target btc | jq '.orders'
```

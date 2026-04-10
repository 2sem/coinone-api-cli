# Output and Automation

## Output modes

- default: concise table or summary view
- `--json`: normalized JSON for automation
- `--output json`: same as `--json`
- `--output raw`: pretty-printed raw Coinone API response

## Automation recommendations

- prefer `--json` for stable machine-readable output
- use `--timeout <ms>` in CI or agent loops to fail fast on slow requests
- use `--base-url <url>` for mocked APIs, replay servers, or local integration tests
- keep private credentials in environment variables instead of inline flags or prompts
- for team-wide sharing, prefer Git-based installation over npm package publishing if you do not want to manage an npm package

## Examples

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

# Commands

## Global options

- `--json`: emit normalized JSON for scripts and agents
- `--output <mode>`: choose `table`, `json`, or `raw`
- `--base-url <url>`: point the CLI at a proxy, mock server, or alternate Coinone-compatible host
- `--timeout <ms>`: set a request timeout in milliseconds for every API call in the command
- `--color`: force colorized error output

## Command groups

### Public commands

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

### Private read commands

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

### Private write commands

```text
coinone orders place --quote <quoteCurrency> --target <targetCurrency> --side <buy|sell> --type limit --price <string> --qty <string> [--post-only] [--user-order-id <id>] (--dry-run | --confirm live)
coinone orders cancel --order-id <id> --quote <quoteCurrency> --target <targetCurrency> [--user-order-id <id>] --confirm live
```

## Validation notes

- `orderbook get --size`: one of `5`, `10`, `15`, `16`
- `trades list --size`: one of `10`, `50`, `100`, `150`, `200`
- `orders completed --from/--to`: UTC millisecond timestamps or ISO-8601 values
- `orders completed`: max time window is `90` days and `--quote`/`--target` must be passed together
- `orders place`: only `--type limit` is supported in the MVP
- `orders place`: exactly one of `--dry-run` or `--confirm live` is required
- `orders cancel`: `--confirm live` is always required in the MVP

## Notable behavior

- `markets list` defaults to the `KRW` market because the public API requires a quote currency in the path while the requested CLI shape omits it
- `ticker list` defaults to `KRW` when `--quote` is omitted because Coinone exposes quote-scoped ticker listing endpoints
- private commands fail fast with a non-zero error when auth env vars are missing

## Examples

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

# coinone-api-cli

A small, developer- and AI-friendly Node.js CLI for Coinone public APIs plus a safe read-only private API subset.

It aims for familiar CLI ergonomics inspired by tools like `gh`, `httpie`, and `stripe`:

- clear nested commands
- strong help output with examples
- readable default tables
- stable `--json` output for scripts and agents
- actionable error messages
- minimal dependencies

The CLI exposes public market data plus a minimal authenticated workflow for balances, fees, order lookup, and order history. Private commands are read-only and never print raw secrets.

## Requirements

- Node.js 20.10+

## Install

```bash
npm install
npm run build
```

Run locally without building:

```bash
npm run cli -- --help
```

Run built CLI:

```bash
node dist/bin/coinone.js --help
```

## Commands

```text
coinone markets list
coinone markets get <targetCurrency> --quote <quoteCurrency>
coinone auth status
coinone balances list
coinone balances get <currency>
coinone currencies list
coinone currencies get <currency>
coinone fees list
coinone orders active [--quote <quoteCurrency>] [--target <targetCurrency>] [--type <type>]
coinone orders get <orderId> --quote <quoteCurrency> --target <targetCurrency> [--user-order-id <id>]
coinone orders completed --from <timestamp-ms|iso> --to <timestamp-ms|iso> [--size <1-100>] [--to-trade-id <id>] [--quote <quoteCurrency> --target <targetCurrency>]
coinone ticker get <targetCurrency> --quote <quoteCurrency>
coinone ticker list [--quote <quoteCurrency>]
coinone orderbook get <targetCurrency> --quote <quoteCurrency> [--size <n>]   # size: 5, 10, 15, 16
coinone trades list <targetCurrency> --quote <quoteCurrency> [--size <n>]      # size: 10, 50, 100, 150, 200
coinone range-units get <targetCurrency> --quote <quoteCurrency>
```

## Output modes

- default: concise table or summary view
- `--json`: normalized JSON for automation
- `--output json`: same as `--json`
- `--output raw`: pretty-printed raw Coinone API response
- `orderbook get --size`: one of `5`, `10`, `15`, `16`
- `trades list --size`: one of `10`, `50`, `100`, `150`, `200`
- `orders completed --from/--to`: UTC millisecond timestamps or ISO-8601 values
- `orders completed`: max time window is `90` days and `--quote`/`--target` must be passed together

Examples:

```bash
coinone markets list
coinone auth status
coinone balances list --json
coinone balances get btc
coinone fees list
coinone orders active --quote krw --target btc --type limit
coinone orders get 12345 --quote krw --target btc
coinone orders completed --from 2026-01-01T00:00:00Z --to 2026-01-07T00:00:00Z
coinone orders completed --from 1735689600000 --to 1736294400000 --quote krw --target btc --json
coinone markets get btc --quote krw
coinone ticker list --quote krw
coinone ticker get btc --quote krw --json
coinone orderbook get btc --quote krw --size 10
coinone trades list btc --quote krw --size 50 --output raw
```

## Private API auth

Coinone private API v2.1 requests are signed with env-based credentials:

- `COINONE_ACCESS_TOKEN`
- `COINONE_SECRET_KEY`

Setup example:

```bash
export COINONE_ACCESS_TOKEN="your-access-token"
export COINONE_SECRET_KEY="your-secret-key"
coinone auth status
```

Signing behavior for private commands:

- POST-only requests
- request body includes `access_token` and a UUID v4 `nonce`
- JSON body is Base64 encoded into `X-COINONE-PAYLOAD`
- payload is signed with HMAC SHA512 into `X-COINONE-SIGNATURE`

Safety notes:

- `coinone auth status` only validates local env configuration; it does not need to call Coinone
- secrets are never echoed in CLI output, examples, or normalized JSON
- prefer shell env vars or a local secret manager; do not put secrets directly in command history

## Notes and assumptions

- `markets list` defaults to the `KRW` market because the public API requires a quote currency in the path while the requested CLI shape omits it.
- `ticker list` also defaults to `KRW` when `--quote` is omitted because Coinone exposes quote-scoped ticker listing endpoints.
- private commands fail fast with a non-zero error when auth env vars are missing.
- The CLI uses current Coinone public v2 endpoints from `docs.coinone.co.kr/reference`:
  - `/public/v2/markets/{quote_currency}`
  - `/public/v2/markets/{quote_currency}/{target_currency}`
  - `/public/v2/currencies`
  - `/public/v2/currencies/{currency}`
  - `/public/v2/ticker_new/{quote_currency}`
  - `/public/v2/ticker_new/{quote_currency}/{target_currency}`
  - `/public/v2/orderbook/{quote_currency}/{target_currency}`
  - `/public/v2/trades/{quote_currency}/{target_currency}`
  - `/public/v2/range_units/{quote_currency}/{target_currency}`
- Private v2.1 endpoints used in this pass:
  - `/v2.1/account/balance/all`
  - `/v2.1/account/balance`
  - `/v2.1/account/trade_fee`
  - `/v2.1/order/active_orders`
  - `/v2.1/order/detail`
  - `/v2.1/order/completed_orders/all`
  - `/v2.1/order/completed_orders`

## Scripts

```bash
npm run build
npm test
npm run cli -- --help
```

## Architecture

- `src/cli.ts`: root command tree and global options
- `src/commands/`: command modules per resource
- `src/lib/client.ts`: shared Coinone public/private API client using native `fetch`
- `src/lib/auth.ts`: env validation and Coinone v2.1 request signing
- `src/lib/output.ts`: output mode resolution and rendering
- `src/lib/errors.ts`: normalized CLI and API error handling
- `src/lib/formatters.ts`: table/summary formatting helpers
- `src/lib/time.ts`: timestamp parsing and completed-order window validation

## Example automation

```bash
coinone ticker get btc --quote krw --json
coinone currencies list --json
coinone balances list --json
coinone orders active --quote krw --json
coinone orders completed --from 2026-01-01T00:00:00Z --to 2026-01-02T00:00:00Z --json
```

```bash
last_price=$(coinone ticker get btc --quote krw --json | jq -r '.last')
echo "$last_price"
```

# coinone-api-cli

A small, developer- and AI-friendly Node.js CLI for Coinone public APIs plus a guarded private API subset.

It aims for familiar CLI ergonomics inspired by tools like `gh`, `httpie`, and `stripe`:

- clear nested commands
- strong help output with examples
- readable default tables
- stable `--json` output for scripts and agents
- actionable error messages
- minimal dependencies

The CLI exposes public market data plus a minimal authenticated workflow for balances, fees, order lookup, order history, and guarded order writes. Private commands never print raw secrets, and write actions require explicit safety flags.

## Requirements

- Node.js 20.10+

## Install

### Local development install

```bash
npm install
npm run build
npm run cli -- --help
```

### Global install from a local checkout

```bash
npm install
npm run build
npm install -g .
coinone --help
coinone doctor
```

### Local package smoke test before sharing

```bash
npm test
npm run build
npm pack --dry-run
```

The GitHub Actions CI job runs the same release-readiness checks on every `push` and `pull_request`.

### Install directly from a Git repository

Once this repo is hosted on GitHub or another Git server, you can install it directly without npm publishing:

```bash
npm install -g <git-url>
coinone --help
coinone doctor --json
```

Git-based installs ship with the built `dist/` output in the repository, so you do not need local TypeScript tooling or a manual `npm run build` step before `npm install -g git+https://github.com/2sem/coinone-api-cli.git`.

Examples:

```bash
npm install -g git+https://github.com/2sem/coinone-api-cli.git
npm install -g git+ssh://git@github.com/2sem/coinone-api-cli.git
```

You can also run the built local binary directly:

```bash
node dist/bin/coinone.js --help
```

### Installed CLI troubleshooting

If `npm install -g` succeeds but `coinone` is still not found, the problem is usually your shell environment rather than the package itself.

- the global npm bin directory is environment-dependent and may not already be on `PATH`
- Git-based global installs still depend on your local Node.js and npm global bin setup
- opening a new shell session can be required after changing shell profile files

Useful checks:

```bash
npm bin -g
npm prefix -g
coinone doctor
coinone doctor --json
```

If the command is missing after `npm install -g`, compare the directory from `npm bin -g` with your current `PATH` and add it in your shell profile if needed. For example, Homebrew, nvm, fnm, Volta, and system Node installs often use different global bin locations.

## Update

### If you installed from the Git repository

Re-run the global install command against the repo:

```bash
npm install -g git+https://github.com/2sem/coinone-api-cli.git
```

### If you installed from a local clone

Pull the latest changes, rebuild, and reinstall globally:

```bash
git pull
npm install
npm run build
npm install -g .
```

### Check the installed version

```bash
coinone --version
```

## Global options

- `--json`: emit normalized JSON for scripts and agents
- `--output <mode>`: choose `table`, `json`, or `raw`
- `--base-url <url>`: point the CLI at a proxy, mock server, or alternate Coinone-compatible host
- `--timeout <ms>`: set a request timeout in milliseconds for every API call in the command
- `--color`: force colorized error output

## Commands

```text
coinone markets list
coinone markets get <targetCurrency> --quote <quoteCurrency>
coinone doctor
coinone auth status
coinone balances list
coinone balances get <currency>
coinone currencies list
coinone currencies get <currency>
coinone fees list
coinone fees get --quote <quoteCurrency> --target <targetCurrency>
coinone orders active [--quote <quoteCurrency>] [--target <targetCurrency>] [--type <type>]
coinone orders get <orderId> --quote <quoteCurrency> --target <targetCurrency> [--user-order-id <id>]
coinone orders place --quote <quoteCurrency> --target <targetCurrency> --side <buy|sell> --type limit --price <string> --qty <string> [--post-only] [--user-order-id <id>] (--dry-run | --confirm live)
coinone orders cancel --order-id <id> --quote <quoteCurrency> --target <targetCurrency> [--user-order-id <id>] --confirm live
coinone orders completed --from <timestamp-ms|iso> --to <timestamp-ms|iso> [--size <1-100>] [--to-trade-id <id>] [--quote <quoteCurrency> --target <targetCurrency>]
coinone ticker get <targetCurrency> --quote <quoteCurrency>
coinone ticker list [--quote <quoteCurrency>]
coinone orderbook get <targetCurrency> --quote <quoteCurrency> [--size <n>]   # size: 5, 10, 15, 16
coinone trades list <targetCurrency> --quote <quoteCurrency> [--size <n>]      # size: 10, 50, 100, 150, 200
coinone range-units get <targetCurrency> --quote <quoteCurrency>
```

## Quickstart

### Public market data

```bash
coinone markets list
coinone ticker get btc --quote krw
coinone trades list btc --quote krw --size 50 --json
coinone orderbook get btc --quote krw --size 10
```

### Private read-only commands

```bash
export COINONE_ACCESS_TOKEN="your-access-token"
export COINONE_SECRET_KEY="your-secret-key"

coinone doctor
coinone auth status
coinone balances list
coinone fees get --quote krw --target btc
coinone orders completed --from 2026-01-01T00:00:00Z --to 2026-01-02T00:00:00Z --json
```

### Private order writes with safety rails

WARNING: `orders place --confirm live` and `orders cancel --confirm live` can submit real account changes immediately. Prefer `--dry-run` first, verify the pair, side, price, and quantity, and only then run the live command.

```bash
# local validation only; no Coinone request is sent
coinone orders place --quote krw --target btc --side buy --type limit --price 1000 --qty 0.01 --dry-run

# real submission; requires explicit confirmation
coinone orders place --quote krw --target btc --side buy --type limit --price 1000 --qty 0.01 --confirm live

# optional post-only limit order
coinone orders place --quote krw --target btc --side sell --type limit --price 1200 --qty 0.01 --post-only --confirm live

# real cancellation; live-only in the MVP
coinone orders cancel --order-id 12345 --quote krw --target btc --confirm live
```

### Script-friendly examples

```bash
coinone doctor
coinone doctor --json
coinone --json ticker get btc --quote krw
coinone --timeout 10000 ticker list --quote krw --json
coinone --base-url http://127.0.0.1:4010 --json markets get btc --quote krw
coinone balances list --json
```

```bash
last_price=$(coinone --json ticker get btc --quote krw | jq -r '.last')
echo "$last_price"
```

```bash
coinone --json orders active --quote krw --target btc | jq '.orders'
coinone --output raw ticker get btc --quote krw
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
- `orders place`: only `--type limit` is supported in the MVP
- `orders place`: exactly one of `--dry-run` or `--confirm live` is required
- `orders cancel`: `--confirm live` is always required in the MVP

Examples:

```bash
coinone doctor
coinone doctor --json
coinone markets list
coinone auth status
coinone balances list --json
coinone balances get btc
coinone fees list
coinone fees get --quote krw --target btc
coinone orders active --quote krw --target btc --type limit
coinone orders get 12345 --quote krw --target btc
coinone orders place --quote krw --target btc --side buy --type limit --price 1000 --qty 0.01 --dry-run
coinone orders place --quote krw --target btc --side sell --type limit --price 1200 --qty 0.01 --post-only --confirm live
coinone orders cancel --order-id 12345 --quote krw --target btc --confirm live
coinone orders completed --from 2026-01-01T00:00:00Z --to 2026-01-07T00:00:00Z
coinone orders completed --from 1735689600000 --to 1736294400000 --quote krw --target btc --json
coinone --timeout 15000 ticker get btc --quote krw --json
coinone --base-url http://127.0.0.1:4010 ticker list --quote krw
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
coinone doctor
coinone auth status
```

Signing behavior for private commands:

- POST-only requests
- request body includes `access_token` and a UUID v4 `nonce`
- JSON body is Base64 encoded into `X-COINONE-PAYLOAD`
- payload is signed with HMAC SHA512 into `X-COINONE-SIGNATURE`

Safety notes:

- `coinone doctor` is local-only install and env diagnostics; it never needs network access for the MVP
- `coinone auth status` only validates local env configuration; it does not need to call Coinone
- secrets are never echoed in CLI output, examples, or normalized JSON
- prefer shell env vars or a local secret manager; do not put secrets directly in command history
- `coinone orders place` requires either `--dry-run` or `--confirm live`
- `coinone orders cancel` is live-only and always requires `--confirm live`
- run a dry run before any live order placement whenever possible

Private fee examples:

```bash
coinone fees list
coinone fees get --quote krw --target btc
coinone fees get --quote krw --target btc --json
```

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
  - `/v2.1/account/trade_fee/{quote_currency}/{target_currency}`
  - `/v2.1/order/active_orders`
  - `/v2.1/order`
  - `/v2.1/order/cancel`
  - `/v2.1/order/detail`
  - `/v2.1/order/completed_orders/all`
  - `/v2.1/order/completed_orders`

## Scripting for AI agents and automation

- prefer `--json` for stable machine-readable output
- use `--timeout <ms>` in CI or agent loops to fail fast on slow requests
- use `--base-url <url>` for mocked APIs, replay servers, or local integration tests
- keep private credentials in environment variables instead of inline flags or prompts
- for team-wide sharing, prefer Git-based installation over npm package publishing if you do not want to manage an npm package

Examples:

```bash
coinone --json currencies list
coinone --json balances get btc
coinone --json orders completed --from 2026-01-01T00:00:00Z --to 2026-01-02T00:00:00Z --quote krw --target btc
```

```bash
market_json=$(coinone --json markets get btc --quote krw)
price_unit=$(printf '%s' "$market_json" | jq -r '.priceUnit')
echo "$price_unit"
```

## Scripts

```bash
npm run build
npm test
npm run cli -- --help
npm pack --dry-run
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

# coinone-api-cli

A small, developer- and AI-friendly Node.js CLI for Coinone public APIs plus a guarded private API subset.

## Documentation

- GitHub Pages guide: https://2sem.github.io/coinone-api-cli/
- Local docs preview:

```bash
npm install
npm run docs:dev
```

## Install

```bash
npm install -g coinone-api-cli
coinone --help
coinone doctor --json
```

## Quick examples

```bash
coinone markets list
coinone ticker get btc --quote krw
coinone trades list btc --quote krw --size 50 --json
```

```bash
export COINONE_ACCESS_TOKEN="your-access-token"
export COINONE_SECRET_KEY="your-secret-key"

coinone doctor
coinone auth status
coinone balances list
coinone --max-retries 1 ticker get btc --quote krw
```

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
coinone orders place --quote <quoteCurrency> --target <targetCurrency> --side <buy|sell> --type limit --price <string> --qty <string> [--post-only] [--user-order-id <id>] [--auto-user-order-id] (--dry-run | --confirm live)
coinone orders cancel --order-id <id> --quote <quoteCurrency> --target <targetCurrency> [--user-order-id <id>] --confirm live
coinone orders completed --from <timestamp-ms|iso> --to <timestamp-ms|iso> [--size <1-100>] [--to-trade-id <id>] [--quote <quoteCurrency> --target <targetCurrency>]
coinone ticker get <targetCurrency> --quote <quoteCurrency>
coinone ticker list [--quote <quoteCurrency>]
coinone orderbook get <targetCurrency> --quote <quoteCurrency> [--size <n>]
coinone trades list <targetCurrency> --quote <quoteCurrency> [--size <n>]
coinone range-units get <targetCurrency> --quote <quoteCurrency>
```

## Safety

- private commands never print raw secrets
- `orders place` requires `--dry-run` or `--confirm live`
- `orders cancel` always requires `--confirm live`
- `orders place` validates Coinone price units and quantity increments before submission
- `--max-retries` retries safe read commands on 429/5xx without retrying live private writes
- prefer `--auto-user-order-id` or `--user-order-id` for safer live order reconciliation
- prefer a dry run before any live order placement

## Development

```bash
npm test
npm run build
npm run docs:build
npm pack --dry-run
```

## License

MIT

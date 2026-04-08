---
name: coinone-api-cli
description: Use the local Coinone CLI to query Coinone public APIs and private APIs from this repository, including guarded live order placement when explicitly requested. Prefer this skill when the goal is to work through the CLI rather than calling Coinone HTTP endpoints directly.
---

Use this skill when the user wants to work with Coinone data through the CLI in this repository.

## When to Use This Skill

Activate this skill when the user wants to:

- diagnose a global install or runtime setup problem with the CLI
- call Coinone public APIs from the command line
- inspect safe read-only private API data with env-based auth
- place or cancel guarded orders through the CLI when the user explicitly asks for a real trading action
- script Coinone queries for developers or AI agents
- debug or demonstrate this repository's CLI behavior
- use npm, Homebrew, Git-based installation, or local execution examples

## Repo and CLI Discovery

Use this skill in the repository that contains:

- `package.json`
- `src/bin/coinone.ts`
- `README.md`

Primary execution forms:

- inside the repo: `npm run cli -- <command>`
- after build: `node dist/bin/coinone.js <command>`
- after Git/global install: `coinone <command>`

Do not run `node src/bin/coinone.ts` directly with plain Node. That entrypoint is for the TypeScript project workflow, not raw Node execution.

## Preferred Execution Strategy

Use commands in this order:

1. If working inside the repository, prefer:
   - `npm run cli -- <command>`
2. If the project has already been built but not installed globally, use:
   - `node dist/bin/coinone.js <command>`
3. If the CLI is installed globally, use:
   - `coinone <command>`

For first contact or troubleshooting, probe in this order:

1. `npm run cli -- doctor --json`
2. `npm run cli -- --help`
3. `npm run cli -- markets list --json`
4. `npm run cli -- auth status --json`

If credentials live in a local `.env` file and no dotenv loader is installed, load them first with:

```bash
set -a && source .env && set +a
```

## Core Usage Rules

- Prefer `--json` for agent and automation workflows.
- Prefer the CLI over direct Coinone HTTP calls when the repository already supports the endpoint.
- Never print, hardcode, or request private credentials in normal output.
- Private auth must come from environment variables:
  - `COINONE_ACCESS_TOKEN`
  - `COINONE_SECRET_KEY`
- Use `--timeout <ms>` in automation to fail fast.
- Use `--base-url <url>` only for mock servers, proxies, or alternate compatible hosts.
- Do not parse human table output if `--json` is available.

## Supported Command Surface

### Local diagnostics

- `coinone doctor`

### Public

- `coinone markets list`
- `coinone markets get <targetCurrency> --quote <quoteCurrency>`
- `coinone currencies list`
- `coinone currencies get <currency>`
- `coinone ticker get <targetCurrency> --quote <quoteCurrency>`
- `coinone ticker list [--quote <quoteCurrency>]`
- `coinone orderbook get <targetCurrency> --quote <quoteCurrency> [--size <n>]`
- `coinone trades list <targetCurrency> --quote <quoteCurrency> [--size <n>]`
- `coinone range-units get <targetCurrency> --quote <quoteCurrency>`

### Private read-only

- `coinone auth status`
- `coinone balances list`
- `coinone balances get <currency>`
- `coinone fees list`
- `coinone fees get --quote <quoteCurrency> --target <targetCurrency>`
- `coinone orders active [--quote <quoteCurrency>] [--target <targetCurrency>] [--type <type>]`
- `coinone orders get <orderId> --quote <quoteCurrency> --target <targetCurrency> [--user-order-id <id>]`
- `coinone orders completed --from <timestamp-ms|iso> --to <timestamp-ms|iso> [--size <1-100>] [--to-trade-id <id>] [--quote <quoteCurrency> --target <targetCurrency>]`

### Guarded private writes

- `coinone orders place --quote <quoteCurrency> --target <targetCurrency> --side <buy|sell> --type limit --price <string> --qty <string> [--post-only] [--user-order-id <id>] (--dry-run | --confirm live)`
- `coinone orders cancel --order-id <id> --quote <quoteCurrency> --target <targetCurrency> [--user-order-id <id>] --confirm live`

## Recommended Patterns

### Public market data

```bash
npm run cli -- --json ticker get btc --quote krw
npm run cli -- markets list --json
npm run cli -- orderbook get btc --quote krw --size 10 --json
```

### Private auth check

```bash
export COINONE_ACCESS_TOKEN="your-access-token"
export COINONE_SECRET_KEY="your-secret-key"
npm run cli -- doctor --json
npm run cli -- auth status --json
```

### Install and runtime diagnostics

```bash
npm run cli -- doctor
npm run cli -- doctor --json
coinone doctor --json
```

### npm installation

```bash
npm install -g coinone-api-cli
coinone --help
coinone doctor --json
```

### Homebrew installation

```bash
brew tap 2sem/tap
brew install coinone
coinone --help
coinone doctor --json
```

### Private read-only examples

```bash
npm run cli -- balances list --json
npm run cli -- fees get --quote krw --target btc --json
npm run cli -- fees get --quote krw --target usdc --output raw
npm run cli -- orders completed --from 2026-01-01T00:00:00Z --to 2026-01-02T00:00:00Z --json
```

### Guarded write examples

```bash
npm run cli -- doctor --json
npm run cli -- --json markets get usdc --quote krw
npm run cli -- --json orders place --quote krw --target usdc --side buy --type limit --price 1519 --qty 4 --dry-run
npm run cli -- --json orders place --quote krw --target usdc --side buy --type limit --price 1519 --qty 4 --confirm live
npm run cli -- --json orders get <orderId> --quote krw --target usdc
npm run cli -- --json orders cancel --order-id <orderId> --quote krw --target usdc --confirm live
```

### Git-based installation

```bash
npm install -g git+https://github.com/2sem/coinone-api-cli.git
coinone --help
```

### Update commands

```bash
# npm
npm install -g coinone-api-cli

# Homebrew
brew update
brew upgrade coinone
```

## Output and Parsing Guidance

- default output is for humans
- `--json` is the stable automation path
- `--output raw` is useful when debugging upstream Coinone payloads
- prefer normalized JSON fields over reverse-engineering Coinone raw payloads unless the task specifically requires raw output
- if a downstream step needs reliable parsing, rerun the command with `--json`
- for install/runtime debugging, use `coinone doctor --json` first because it does not require network access in the MVP
- fee table output renders percentage strings for humans, so Coinone fee values like `0.0` are shown as `0%`
- fee JSON output keeps normalized raw strings such as `makerFeeRate: "0.0"` and `takerFeeRate: "0.0"`

## Safety and Validation

- Never place or cancel a real order unless the user explicitly requests it.
- For trading actions, always run this sequence unless the user explicitly says otherwise:
  1. `doctor`
  2. optional `markets get` to inspect pair metadata
  3. `orders place --dry-run`
  4. only then `orders place --confirm live`
  5. `orders get` or `orders active`
  6. `orders cancel --confirm live` if cleanup is needed
- `orders place` performs market preflight validation before dry-run success or live submission.
- The live order payload is aligned to Coinone's `/v2.1/order` contract:
  - uppercase currencies
  - uppercase `side`
  - `type` for order type
  - `post_only` included for limit orders
- For private commands, fail clearly if env vars are missing instead of inventing credentials.
- `fees list` and `fees get` require the Coinone **고객 정보** private API permission.
- For completed orders, respect the CLI validation rules:
  - `--from` and `--to` are required
  - max window is 90 days
  - `--quote` and `--target` must be passed together when filtering by pair

## Common Failure Cases

- Missing private env vars:
  - run `npm run cli -- doctor --json`
  - or `npm run cli -- auth status --json`
  - expect missing `COINONE_ACCESS_TOKEN` and/or `COINONE_SECRET_KEY`
- `coinone fees ...` returns `Invalid API permission` / code `40`:
  - confirm the API key has Coinone **고객 정보** permission enabled
  - rerun with `--output raw` if you need to inspect the exact upstream fee payload
- Global install works but `coinone` is not found:
  - compare `npm bin -g` with your shell `PATH`
  - use `coinone doctor` once the binary is reachable
  - remember that npm global bin paths vary across nvm, Homebrew, fnm, Volta, and system Node installs
- Homebrew install troubleshooting:
  - run `brew tap 2sem/tap`
  - run `brew reinstall coinone`
  - verify with `coinone --version` and `coinone doctor --json`
- Timeout/network failures:
  - retry with `--timeout <ms>` adjusted upward
  - check network reachability to the Coinone API
- Invalid completed order window:
  - ensure `--from <= --to`
  - ensure the window is not larger than 90 days
- Incomplete pair filter:
  - pass both `--quote` and `--target`, or omit both
- Unexpected parsing need:
  - rerun with `--json`
- Live order returns Coinone `107 Parameter error`:
  - verify you are using the current built CLI or `npm run cli --`
  - rerun `markets get` for the pair and confirm min/max constraints
  - ensure you are not bypassing preflight with stale build output

## Verification Commands

When changing or validating the CLI, use:

```bash
npm test
npm run build
npm run cli -- --help
```

For packaging and install checks:

```bash
npm pack --dry-run
```

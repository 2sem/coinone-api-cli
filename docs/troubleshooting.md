# Troubleshooting

## Installed CLI not found

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

If the command is missing after `npm install -g`, compare the directory from `npm bin -g` with your current `PATH` and add it in your shell profile if needed.

## Auth errors

- confirm `COINONE_ACCESS_TOKEN` and `COINONE_SECRET_KEY` are exported in the current shell
- run `coinone doctor` before private commands
- remember that `coinone auth status` validates local env configuration only

## Order validation failures

`orders place` performs market preflight validation before returning dry-run success or sending a live order. It fails fast for invalid limit orders such as:

- below-minimum order notional (`price * qty < min_order_amount`)
- unsupported order type for the pair
- trading disabled or maintenance-active markets
- price and quantity outside Coinone min/max bounds

## Useful command pairings

```bash
coinone doctor --json
coinone auth status
coinone markets get btc --quote krw --json
coinone orders place --quote krw --target btc --side buy --type limit --price 1000 --qty 0.01 --dry-run
```

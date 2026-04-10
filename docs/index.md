---
layout: home

hero:
  name: coinone-api-cli
  text: Coinone CLI docs on GitHub Pages
  tagline: A small, developer- and AI-friendly Node.js CLI for Coinone public APIs plus a guarded private API subset.
  actions:
    - theme: brand
      text: Get started
      link: /install
    - theme: alt
      text: Command reference
      link: /command-reference

features:
  - title: Script-friendly
    details: Stable JSON output, clear help text, and predictable command shapes for agents and shell automation.
  - title: Safer private workflows
    details: Private commands never print raw secrets, and order writes require explicit confirmation flags.
  - title: Minimal and familiar
    details: Command ergonomics are inspired by tools like gh, httpie, and stripe with a small dependency footprint.
---

## What this CLI covers

- public market data: markets, currencies, ticker, orderbook, trades, range units
- private read workflows: auth status, balances, fees, order lookup, order history
- guarded private writes: place and cancel orders with explicit safety flags

## User flow

```mermaid
flowchart TD
  A[Install coinone-api-cli] --> B[Run coinone --help]
  B --> C{Need private commands?}
  C -- No --> D[Use public market commands]
  C -- Yes --> E[Export COINONE_ACCESS_TOKEN and COINONE_SECRET_KEY]
  E --> F[Run coinone doctor]
  F --> G[Run auth, balance, fee, or order commands]
  G --> H[Use --dry-run before any live order placement]
```

## Start here

- [Install](./install): npm, Homebrew, Git install, and local development paths
- [Quickstart](./quickstart): copy-paste command examples for common tasks
- [Commands](./commands): quick command overview and notable behavior
- [Command Reference](./command-reference): generated from the live CLI command tree
- [Auth and Safety](./auth-and-safety): environment setup, signing behavior, and live-order safeguards
- [Output and Automation](./output-and-automation): `--json`, `--output raw`, timeouts, and shell scripting patterns
- [Troubleshooting](./troubleshooting): install, PATH, auth, and command validation tips

## Local docs commands

```bash
npm install
npm run docs:dev
npm run docs:build
npm run docs:preview
```

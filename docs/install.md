# Install

## Requirements

- Node.js 20.10+

## Install from npm (recommended)

```bash
npm install -g coinone-api-cli
coinone --help
coinone doctor --json
```

## Install with Homebrew (macOS)

```bash
brew tap 2sem/tap
brew install coinone
coinone --help
coinone doctor --json
```

## Install directly from Git

Use this when you want the latest repository state instead of the npm package.

```bash
npm install -g git+https://github.com/2sem/coinone-api-cli.git
coinone --help
coinone doctor --json
```

Git-based installs ship with the built `dist/` output in the repository, so you do not need to run TypeScript build steps first.

## Local development install

```bash
npm install
npm run build
npm run cli -- --help
```

## Global install from a local checkout

```bash
npm install
npm run build
npm install -g .
coinone --help
coinone doctor
```

## Smoke test before sharing

```bash
npm test
npm run build
npm run docs:build
npm pack --dry-run
```

## Update

### npm install

```bash
npm install -g coinone-api-cli
```

### Homebrew

```bash
brew update
brew upgrade coinone
```

### Git install

```bash
npm install -g git+https://github.com/2sem/coinone-api-cli.git
```

### Local clone

```bash
git pull
npm install
npm run build
npm install -g .
```

### Check installed version

```bash
coinone --version
```

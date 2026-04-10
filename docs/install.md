# 설치

코인원 사용자 기준으로는 빠르게 설치해서 `coinone --help`와 `coinone doctor`를 먼저 확인하는 흐름이 가장 안전합니다.

## 요구 사항

- Node.js 20.10+

## npm으로 설치하기 (권장)

```bash
npm install -g coinone-api-cli
coinone --help
coinone doctor --json
```

## Homebrew로 설치하기 (macOS)

```bash
brew tap 2sem/tap
brew install coinone
coinone --help
coinone doctor --json
```

## Git 저장소에서 바로 설치하기

npm 배포본 대신 저장소 최신 상태를 바로 설치하고 싶을 때 사용합니다.

```bash
npm install -g git+https://github.com/2sem/coinone-api-cli.git
coinone --help
coinone doctor --json
```

Git 기반 설치는 저장소 안의 `dist/` 산출물을 함께 사용하므로, 먼저 TypeScript 빌드를 할 필요가 없습니다.

## 로컬 개발용 설치

```bash
npm install
npm run build
npm run cli -- --help
```

## 로컬 체크아웃을 전역 설치로 올리기

```bash
npm install
npm run build
npm install -g .
coinone --help
coinone doctor
```

## 배포 전 스모크 테스트

```bash
npm test
npm run build
npm run docs:build
npm pack --dry-run
```

## 업데이트

### npm 설치 사용자

```bash
npm install -g coinone-api-cli
```

### Homebrew 사용자

```bash
brew update
brew upgrade coinone
```

### Git 설치 사용자

```bash
npm install -g git+https://github.com/2sem/coinone-api-cli.git
```

### 로컬 클론 사용자

```bash
git pull
npm install
npm run build
npm install -g .
```

### 설치 버전 확인

```bash
coinone --version
```

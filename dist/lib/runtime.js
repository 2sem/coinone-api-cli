import { readFileSync } from 'node:fs';
import path from 'node:path';
function readCliVersion() {
    try {
        const packageJsonPath = new URL('../../package.json', import.meta.url);
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
        return typeof packageJson.version === 'string' ? packageJson.version : 'unknown';
    }
    catch {
        return 'unknown';
    }
}
export const CLI_VERSION = readCliVersion();
export function detectCliExecutablePath(argv = process.argv) {
    const executablePath = argv[1]?.trim();
    if (!executablePath) {
        return undefined;
    }
    return path.isAbsolute(executablePath) ? executablePath : path.resolve(executablePath);
}
//# sourceMappingURL=runtime.js.map
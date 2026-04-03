import { Command } from 'commander';
import { getPrivateAuthStatus } from '../lib/auth.js';
import { renderKeyValueTable } from '../lib/formatters.js';
import { CLI_VERSION, detectCliExecutablePath } from '../lib/runtime.js';
export function createDoctorCommand(dependencies = {}, emitResult) {
    return new Command('doctor')
        .description('Inspect local install and runtime setup without calling Coinone')
        .addHelpText('after', [
        '',
        'Examples:',
        '  coinone doctor',
        '  coinone doctor --json',
        '  COINONE_ACCESS_TOKEN=... COINONE_SECRET_KEY=... coinone doctor'
    ].join('\n'))
        .action(function () {
        const report = buildDoctorReport(dependencies);
        emitResult(this, {
            data: report,
            raw: report,
            renderTable: () => renderDoctorReport(report)
        });
    });
}
function buildDoctorReport(dependencies) {
    const env = dependencies.env ?? process.env;
    const authStatus = getPrivateAuthStatus(env);
    const cliExecutablePath = detectCliExecutablePath(dependencies.argv ?? process.argv);
    const privateAuthConfigured = authStatus.configured;
    const status = privateAuthConfigured ? 'ready' : 'needs-auth';
    const summary = privateAuthConfigured
        ? 'CLI runtime looks healthy and private auth is configured.'
        : 'CLI runtime looks healthy, but private auth is not fully configured yet.';
    const nextSteps = privateAuthConfigured
        ? [
            'Run `coinone balances list --json` when you want to verify live private API access.',
            'Use `coinone doctor --json` for scriptable local diagnostics.'
        ]
        : [
            'Export both `COINONE_ACCESS_TOKEN` and `COINONE_SECRET_KEY` in your shell or secret manager.',
            'Re-run `coinone doctor --json` to confirm local setup without making a network request.'
        ];
    return {
        cliVersion: CLI_VERSION,
        nodeVersion: process.version,
        nodeExecutablePath: dependencies.execPath ?? process.execPath,
        cliExecutablePath,
        currentWorkingDirectory: dependencies.cwd ?? process.cwd(),
        accessTokenConfigured: authStatus.accessTokenConfigured,
        secretKeyConfigured: authStatus.secretKeyConfigured,
        privateAuthConfigured,
        missingEnvVars: authStatus.missing,
        status,
        summary,
        nextSteps
    };
}
function renderDoctorReport(report) {
    return renderKeyValueTable([
        { field: 'CLI version', value: report.cliVersion },
        { field: 'Node.js version', value: report.nodeVersion },
        { field: 'Node executable path', value: report.nodeExecutablePath },
        { field: 'CLI executable path', value: report.cliExecutablePath },
        { field: 'Current working directory', value: report.currentWorkingDirectory },
        { field: 'COINONE_ACCESS_TOKEN set', value: report.accessTokenConfigured },
        { field: 'COINONE_SECRET_KEY set', value: report.secretKeyConfigured },
        { field: 'Private auth configured', value: report.privateAuthConfigured },
        { field: 'Missing env vars', value: report.missingEnvVars },
        { field: 'Status', value: report.status },
        { field: 'Summary', value: report.summary },
        { field: 'Next steps', value: report.nextSteps }
    ]);
}
//# sourceMappingURL=doctor.js.map
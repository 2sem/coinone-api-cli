export function resolveOutputMode(options) {
    if (options.json) {
        return 'json';
    }
    return options.output ?? 'table';
}
export function isColorEnabled(options) {
    if (typeof options.color === 'boolean') {
        return options.color;
    }
    return Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
}
export function renderOutput(result, mode) {
    switch (mode) {
        case 'json':
            return `${JSON.stringify(result.data, null, 2)}\n`;
        case 'raw':
            return `${JSON.stringify(result.raw, null, 2)}\n`;
        case 'table':
        default:
            return result.renderTable();
    }
}
//# sourceMappingURL=output.js.map
function displayValue(value) {
    if (value === null || value === undefined) {
        return '-';
    }
    if (Array.isArray(value)) {
        return value.length === 0 ? '-' : value.join(', ');
    }
    if (typeof value === 'boolean') {
        return value ? 'yes' : 'no';
    }
    return String(value);
}
export function toCode(value) {
    return value.toUpperCase();
}
export function marketPair(targetCurrency, quoteCurrency) {
    return `${toCode(targetCurrency)}/${toCode(quoteCurrency)}`;
}
export function tradeStatusLabel(status) {
    switch (status) {
        case 0:
            return 'halted';
        case 1:
            return 'buy/sell';
        case 2:
            return 'sell-only';
        case 3:
            return 'buy-only';
        default:
            return String(status);
    }
}
export function maintenanceStatusLabel(status) {
    switch (status) {
        case 0:
            return 'normal';
        case 1:
            return 'maintenance';
        default:
            return String(status);
    }
}
export function sideLabel(isSellerMaker) {
    return isSellerMaker ? 'sell' : 'buy';
}
export function formatTimestamp(timestamp) {
    return new Date(timestamp).toISOString();
}
export function renderTable(rows, columns) {
    if (rows.length === 0) {
        return 'No data.\n';
    }
    const widths = columns.map((column) => {
        const cellWidths = rows.map((row) => displayValue(row[column.key]).length);
        return Math.max(column.label.length, ...cellWidths);
    });
    const header = columns
        .map((column, index) => column.label.padEnd(widths[index] ?? column.label.length))
        .join('  ');
    const separator = widths.map((width) => '-'.repeat(width)).join('  ');
    const body = rows
        .map((row) => columns
        .map((column, index) => displayValue(row[column.key]).padEnd(widths[index] ?? column.label.length))
        .join('  '))
        .join('\n');
    return `${header}\n${separator}\n${body}\n`;
}
export function renderKeyValueTable(entries) {
    return renderTable(entries.map((entry) => ({ field: entry.field, value: entry.value })), [
        { key: 'field', label: 'FIELD' },
        { key: 'value', label: 'VALUE' }
    ]);
}
//# sourceMappingURL=formatters.js.map
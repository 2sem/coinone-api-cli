function displayValue(value: unknown): string {
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

export function toCode(value: string): string {
  return value.toUpperCase();
}

export function marketPair(targetCurrency: string, quoteCurrency: string): string {
  return `${toCode(targetCurrency)}/${toCode(quoteCurrency)}`;
}

export function tradeStatusLabel(status: number): string {
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

export function maintenanceStatusLabel(status: number): string {
  switch (status) {
    case 0:
      return 'normal';
    case 1:
      return 'maintenance';
    default:
      return String(status);
  }
}

export function sideLabel(isSellerMaker: boolean): string {
  return isSellerMaker ? 'sell' : 'buy';
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

export function renderTable<TRow extends object>(
  rows: TRow[],
  columns: Array<{ key: string; label: string }>
): string {
  if (rows.length === 0) {
    return 'No data.\n';
  }

  const widths = columns.map((column) => {
    const cellWidths = rows.map((row) => displayValue((row as Record<string, unknown>)[column.key]).length);
    return Math.max(column.label.length, ...cellWidths);
  });

  const header = columns
    .map((column, index) => column.label.padEnd(widths[index] ?? column.label.length))
    .join('  ');
  const separator = widths.map((width) => '-'.repeat(width)).join('  ');
  const body = rows
    .map((row) =>
      columns
        .map((column, index) =>
          displayValue((row as Record<string, unknown>)[column.key]).padEnd(
            widths[index] ?? column.label.length
          )
        )
        .join('  ')
    )
    .join('\n');

  return `${header}\n${separator}\n${body}\n`;
}

export function renderKeyValueTable(entries: Array<{ field: string; value: unknown }>): string {
  return renderTable(
    entries.map((entry) => ({ field: entry.field, value: entry.value })),
    [
      { key: 'field', label: 'FIELD' },
      { key: 'value', label: 'VALUE' }
    ]
  );
}

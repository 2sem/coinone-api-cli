import type { CommandResult, OutputMode, OutputOptions } from './types.js';

export function resolveOutputMode(options: OutputOptions): OutputMode {
  if (options.json) {
    return 'json';
  }

  return options.output ?? 'table';
}

export function isColorEnabled(options: OutputOptions): boolean {
  if (typeof options.color === 'boolean') {
    return options.color;
  }

  return Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
}

export function renderOutput<TNormalized>(
  result: CommandResult<TNormalized>,
  mode: OutputMode
): string {
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

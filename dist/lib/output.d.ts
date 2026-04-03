import type { CommandResult, OutputMode, OutputOptions } from './types.js';
export declare function resolveOutputMode(options: OutputOptions): OutputMode;
export declare function isColorEnabled(options: OutputOptions): boolean;
export declare function renderOutput<TNormalized>(result: CommandResult<TNormalized>, mode: OutputMode): string;

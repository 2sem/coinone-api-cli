import { Command } from 'commander';
import type { CoinoneClient } from '../lib/client.js';
import type { EmitResult } from '../lib/types.js';
export declare function createRangeUnitsCommand(client: CoinoneClient, emitResult: EmitResult): Command;

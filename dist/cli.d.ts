import { Command } from 'commander';
import { type FetchLike } from './lib/client.js';
import type { PrivateAuthEnv } from './lib/types.js';
interface RunCliDependencies {
    env?: PrivateAuthEnv;
    fetchImplementation?: FetchLike;
    stdout?: {
        write(chunk: string): void;
    };
    stderr?: {
        write(chunk: string): void;
    };
    baseUrl?: string;
    timeoutMs?: number;
    argv?: string[];
    cwd?: string;
    execPath?: string;
}
export declare function createCli(dependencies?: RunCliDependencies): Command;
export declare function runCli(argv?: string[], dependencies?: RunCliDependencies): Promise<number>;
export {};

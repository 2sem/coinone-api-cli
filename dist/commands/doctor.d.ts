import { Command } from 'commander';
import type { EmitResult, PrivateAuthEnv } from '../lib/types.js';
interface CreateDoctorCommandDependencies {
    env?: PrivateAuthEnv;
    argv?: string[];
    cwd?: string;
    execPath?: string;
}
export declare function createDoctorCommand(dependencies: CreateDoctorCommandDependencies | undefined, emitResult: EmitResult): Command;
export {};

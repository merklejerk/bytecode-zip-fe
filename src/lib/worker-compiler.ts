
import type { Abi } from 'abitype';
const SOLJSON_URL = 'soljson-v0.8.20+commit.a1b79de6.js';

let worker: Worker | undefined;
export const COMPILER_VERSION = SOLJSON_URL.slice(8, -3);

export interface CompilerInput {
    language: string,
    sources: {
        [name: string]: {
            content: string;
        };
    };
    settings: {
        optimizer: {
            enabled: boolean;
            runs: number;
        };
        viaIR?: boolean;
        outputSelection: {
            [file: string]: {
                [contract: string]: string[];
            };
        };
    };
}

export interface ContractCompilerOutput {
    abi: Abi;
    evm: {
        bytecode: { object: string; };
        deployedBytecode: { object: string; };
    };
}

export interface CompilerOutput {
    errors?: Array<
        {
            sourceLocation: {
                file: string;
                start: number;
                end: number;
            };
            type: string;
            severity: 'error' | 'warning' | 'info';
            errorCode: number;
            message: string;
            formattedMessage: string;
        }
    >;
    contracts: {
        [file: string]: {
            [contract: string]: ContractCompilerOutput;
        };
    };
    metadata: {
        compiler: { version: string };
    };
}

export function getWorker(): Worker {
    if (!worker) {
        worker = new Worker('/compile.worker.js');
    }
    return worker;
}

export async function solcCompile(input: CompilerInput): Promise<CompilerOutput> {
    const worker = getWorker();
    const jobId = crypto.randomUUID();
    const output = await new Promise((accept, reject) => {
        function handler(this: Worker, event: MessageEvent) {
            if (event.data.jobId == jobId) {
                this.removeEventListener('message', handler);
                accept(event.data.output);
            }
        }
        worker.addEventListener('message', handler);
        worker.postMessage({
            jobId,
            soljson: SOLJSON_URL,
            input,
        });
    }) as CompilerOutput;
    output.metadata = output.metadata || {};
    output.metadata.compiler = output.metadata.compiler || {};
    output.metadata.compiler.version = COMPILER_VERSION;
    return output;
}
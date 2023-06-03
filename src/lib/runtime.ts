import type { Abi, AbiFunction, AbiParameter } from 'abitype';
import { Buffer } from 'buffer/';
import {
    solcCompile as compile,
    type CompilerInput,
} from './worker-compiler';
import Handlebars from 'handlebars';
import codeTemplate from './sol/Wrapper.sol.handlebars?raw';
import { numberToBytes, hexToBytes, keccak256 } from 'viem';
import { COMPILER_VERSION  } from './worker-compiler';
import { PUBLIC_Z_VERSION } from '$env/static/public';

interface RuntimeResult {
    initCode: Buffer;
    source?: {
        compiler: string;
        code: string;
        optimizerRuns: number;
    }
}

interface FunctionTemplate {
    name: string;
    modifiers?: string;
    returns?: string;
    params?: string,
}

const OPTIMIZER_RUNS = 200;

export function buildSelfExtracting(
    unzippedInitCode: Buffer,
    zippedInitCode: Buffer,
    zAddress: `0x${string}`,
    ): Buffer
{
    const runtimeCode = createSelfExtractingRuntime(
        unzippedInitCode,
        zippedInitCode,
        zAddress
    );
    return createRawDeployerInitCode(runtimeCode);
}

export async function buildVerifiableForwarder(
    zippedAddress: `0x${string}`,
    contractName: string,
    abi: Abi,
    ): Promise<RuntimeResult>
{
    const code = Handlebars.compile(codeTemplate)({
        version: PUBLIC_Z_VERSION,
        contractName,
        compiler: COMPILER_VERSION,
        optimizerRuns: OPTIMIZER_RUNS,
        zippedAddress,
        zippedAddressHex: zippedAddress.slice(2).toLowerCase(),
        functions:
            (abi.filter(e => e.type === 'function') as AbiFunction[])
            .map(createFunctionTemplateFromAbi),
        structs: Object.values(createStructs(abi)),
    });
    const solcOutput = await compile(createSolcInput({
        [`wrapper`]: code,
    }));

    if (solcOutput.errors) {
        const errors = solcOutput.errors.filter(e => e.severity === 'error');
        if (errors.length) {
            throw new Error(`Compilation errors encountered: ${
                errors.map(e => e.formattedMessage).join('\n')
            }`);
        }
    }
    return {
        initCode: Buffer.from(
            solcOutput.contracts[`wrapper`][contractName]
                .evm.bytecode.object.slice(2)
        ),
        source: {
            code,
            compiler: solcOutput.metadata.compiler.version,
            optimizerRuns: OPTIMIZER_RUNS,
        },
    };
}

function createSolcInput(files: { [file: string]: string }): CompilerInput {
    return {
        language: 'Solidity',
        sources: Object.assign(
            {}, ...Object.entries(files).map(([k, v]) => ({[k]: { content: v }}))
        ),
        settings: {
            optimizer: { enabled: true, runs: OPTIMIZER_RUNS },
            outputSelection: {
                '*': { '*': ['evm.deployedBytecode.object', 'evm.bytecode.object', 'abi']},
                
            },
        },
    };
}

function createSelfExtractingRuntime(
    unzippedInitCode: Buffer,
    zippedInitCode: Buffer,
    zAddress: `0x${string}`): Buffer
{
    return Buffer.concat([
        //// FALLBACK()
        Buffer.from("3d60", 'hex'),
        Buffer.from([0x9f]),
        Buffer.from("3d52363d593773", 'hex'),
        Buffer.alloc(20), // To be filled in by RuntimeDeployer constructor
        Buffer.from("59523d3d601c8059039073", 'hex'),
        hexToBytes(zAddress),
        Buffer.from("5af4813d3d82803e911561004c57f35bfd", 'hex'),
        //// METADATA
        numberToBytes(unzippedInitCode.length, {size: 3}),
        hexToBytes(keccak256(unzippedInitCode)),
        //// ZIPPED DATA
        zippedInitCode
    ]);
}

function createRawDeployerInitCode(runtimeCode: Buffer): Buffer {
    return Buffer.concat([
        hexToBytes("0x608060405234801561001057600080fd5b5060405161011738038061011783398101604081905261002f9161004d565b805160208201f35b634e487b7160e01b600052604160045260246000fd5b6000602080838503121561006057600080fd5b82516001600160401b038082111561007757600080fd5b818501915085601f83011261008b57600080fd5b81518181111561009d5761009d610037565b604051601f8201601f19908116603f011681019083821181831017156100c5576100c5610037565b8160405282815288868487010111156100dd57600080fd5b600093505b828410156100ff57848401860151818501870152928501926100e2565b60008684830101528096505050505050509291505056fe"),
        numberToBytes(0x20, {size: 32}),
        numberToBytes(runtimeCode.length, {size: 32}),
        runtimeCode,
    ]);
}

function createFunctionTemplateFromAbi(fn: AbiFunction): FunctionTemplate {
    return {
        name: fn.name,
        modifiers: 'view', // always view
        params: fn.inputs.length === 0
            ? undefined
            : fn.inputs.map(i => `${encodeParameter(i)}`).join(','),
        returns: fn.outputs.length === 0
            ? undefined
            : fn.outputs.map(o => `${encodeParameter(o)}`).join(','),
    };
}

interface StructTemplate {
    name: string;
    fields?: string[];
}

interface StructMap {
    [name: string]: StructTemplate;
}

interface AbiTupleParameter {
    type: 'tuple',
    name: string;
    components: AbiParameter[];
}

function createStructs(abi: Abi): StructMap {
    const structsByName: StructMap = {};
    for (const e of abi) {
        if (e.type === 'function') {
            for (const i of [...e.inputs, ...e.outputs]) {
                if (i.type === 'tuple') {
                    const name = encodeTypeName(i);
                    const t = (i as AbiTupleParameter);
                    const fields = t.components.map(c => encodeParameter(c, true));
                    console.log(name, fields);
                    structsByName[name] = { name, fields };
                }
            }
        }
    }
    return structsByName;
}

function encodeParameter(p: AbiParameter, isField: boolean = false): string {
    const isMemory = p.type === 'tuple' ||
        p.type === 'bytes' ||
        p.type === 'string' ||
        p.type.match(/\[\d?]$/);
    return `${encodeTypeName(p)}${!isField && isMemory ? ' calldata' : ''} ${p.name}`;
}

function encodeTypeName(p: AbiParameter): string {
    if (p.type === 'tuple') {
        const m = /^struct ([^\s.]+\.)?([\S]+)/.exec(p.internalType!);
        if (m![1]) {
            return `${m![1].slice(0, -1)}__${m![2]}`;
        }
        return m![2];
    }
    return p.type;
}
import type { Abi, AbiFunction, AbiParameter } from 'abitype';
import { Buffer } from 'buffer/';
import {
    solcCompile as compile,
    type CompilerInput,
} from './worker-compiler';
import Handlebars from 'handlebars';
import codeTemplate from './sol/Wrapper.sol.handlebars?raw';
import { numberToBytes, hexToBytes, keccak256, getAddress } from 'viem';
import { COMPILER_VERSION  } from './worker-compiler';
import { PUBLIC_Z_VERSION } from '$env/static/public';
import type { Address } from 'viem';

interface ForwarderResult {
    initCode: Buffer;
    compilerInput: CompilerInput;
}

interface FunctionTemplate {
    name: string;
    modifiers?: string;
    returns?: string;
    params?: string,
}

export function buildSelfExtracting(
    unzippedInitCode: Buffer,
    zippedInitCode: Buffer,
    zAddress: Address,
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
    zippedAddress: Address,
    contractName: string,
    abi: Abi,
    ): Promise<ForwarderResult>
{
    const code = Handlebars.compile(codeTemplate)({
        version: PUBLIC_Z_VERSION,
        contractName,
        compiler: COMPILER_VERSION,
        zippedAddress: getAddress(zippedAddress),
        zippedAddressHex: zippedAddress.slice(2).toLowerCase(),
        functions:
            (abi.filter(e => e.type === 'function') as AbiFunction[])
            .map(createFunctionTemplateFromAbi),
        structs: Object.values(createStructs(abi)),
    });
    const compilerInput = createSolcInput({ [`wrapper`]: code });
    const solcOutput = await compile(compilerInput);

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
                .evm.bytecode.object,
            'hex',
        ),
        compilerInput,
    };
}

function createSolcInput(files: { [file: string]: string }): CompilerInput {
    return {
        language: 'Solidity',
        sources: Object.assign(
            {}, ...Object.entries(files).map(([k, v]) => ({[k]: { content: v }}))
        ),
        settings: {
            optimizer: { enabled: true, runs: 1 },
            debug: { revertStrings: 'strip' },
            metadata: { appendCBOR: false },
            outputSelection: {
                '*': { '*': ['evm.deployedBytecode.object', 'evm.bytecode.object', 'abi']},
                
            },
        },
    };
}

function createSelfExtractingRuntime(
    unzippedInitCode: Buffer,
    zippedInitCode: Buffer,
    zAddress: Address): Buffer
{
    return Buffer.concat([
        //// FALLBACK()
        Buffer.from("3d609f3d52363d593773", 'hex'),
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
        hexToBytes("0x608060405234801561001057600080fd5b5060405161012d38038061012d83398101604081905261002f91610063565b602a810180516001600160601b03163060601b179052805160208201f35b634e487b7160e01b600052604160045260246000fd5b6000602080838503121561007657600080fd5b82516001600160401b038082111561008d57600080fd5b818501915085601f8301126100a157600080fd5b8151818111156100b3576100b361004d565b604051601f8201601f19908116603f011681019083821181831017156100db576100db61004d565b8160405282815288868487010111156100f357600080fd5b600093505b8284101561011557848401860151818501870152928501926100f8565b60008684830101528096505050505050509291505056fe"),
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
            : fn.inputs.map(i => `${encodeParameter(i, ParamContext.PublicArgument)}`).join(','),
        returns: fn.outputs.length === 0
            ? undefined
            : fn.outputs.map(o => `${encodeParameter(o, ParamContext.Return)}`).join(','),
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
                    const fields = t.components.map(c => encodeParameter(c, ParamContext.Field));
                    structsByName[name] = { name, fields };
                }
            }
        }
    }
    return structsByName;
}

enum ParamContext {
    Field,
    PublicArgument,
    Return,
}

function encodeParameter(p: AbiParameter, context: ParamContext = ParamContext.Return): string {
    const isMemory = p.type === 'tuple' ||
        p.type === 'bytes' ||
        p.type === 'string' ||
        p.type.match(/\[\d?]$/);
    let memloc = '';
    if (isMemory) {
        if (context === ParamContext.Return) {
            memloc = 'memory';
        } else if (context === ParamContext.PublicArgument) {
            memloc = 'calldata';
        }
    }
    return [encodeTypeName(p), memloc, p.name].join(' ');
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
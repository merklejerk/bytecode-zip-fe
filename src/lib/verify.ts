import type { Address } from "viem";
import type { CompilerInput } from "./worker-compiler";

export async function verifyContract(
    explorerUrl: string,
    apiKey: string,
    address: Address,
    contractName: string,
    compilerInput: CompilerInput,
    compilerVersion: string,
): Promise<void> {
    const url = getApiUrl(explorerUrl);
    const [sourceName ] = Object.entries(compilerInput.sources)[0];
    let verifyGuid: string;
    const submit = async () => {
        const submission = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
            },
            body: (() => {
                const data = {
                    'apikey': apiKey,
                    'module': 'contract',
                    'action': 'verifysourcecode',
                    'contractaddress': address,
                    'codeformat': 'solidity-standard-json-input',
                    'contractname': `${sourceName}:${contractName}`,
                    'sourceCode': JSON.stringify(compilerInput),
                    'compilerversion': compilerVersion,
                    'licenseType': '1',
                };
                return new URLSearchParams(data);
            })(),
        });
        if (!submission.ok) {
            throw new Error('Verify request failed');
        }
        const result = await submission.json();
        if (result.result.startsWith('Unable to locate ContractCode at')) {
            return new Promise(a =>setTimeout(async () => { a(submit()); }, 2e3));
        }
        if (result.status !== '1' && result.message !== 'OK') {
            throw new Error(`Verification submission failed: ${result.result}`);
        }
        verifyGuid = result.result as string;
    };
    await submit(); 
    const checkUrl = `${url}?` + new URLSearchParams({
        'apikey': apiKey,
        'guid': verifyGuid!,
        'module': 'contract',
        'action': 'checkverifystatus',
    }).toString();
    const check = async () => {
        const r = await fetch(checkUrl);
        const result = await r.json();
        if (result.message === 'OK' || result.result === 'Already Verified') {
            return;
        }
        if (result.result !== 'Pending in queue') {
            throw new Error(`Check verification status failed: ${result.result}`);
        }
        return new Promise(a =>setTimeout(async () => { a(check()); }, 2e3));
    };
    await check();
}

function getApiUrl(explorerUrl: string): string {
    const u = new URL(explorerUrl);
    const m = /^([^.]+).([^.]+.[^.]+)$/.exec(u.host);
    if (m) {
        return `${u.protocol}//api-${m[1]}.${m[2]}/api`;
    }
    return `${u.protocol}//${u.host}/api`;
}
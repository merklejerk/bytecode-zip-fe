<script lang="ts">
    import type { Abi, Address, TransactionReceipt } from "viem";
    import type { PendingTransaction, Wallet } from "./wallet";
    import { createEventDispatcher } from "svelte";
    import ProgressSpinner from "./progress-spinner.svelte";
    import { EXPLORERS, NETWORK_NAMES } from "./constants";
    import type { Buffer } from 'buffer/';
    import type { CompilerInput } from "./worker-compiler";
    import { buildVerifiableForwarder } from "./runtime";

    export let wallet: Wallet;
    export let selfExtractingZipAddress: Address | undefined = undefined;
    export let unzippedContractAbi: Abi;
    export let wrapperAddress: Address | undefined = undefined;
    const dispatch = createEventDispatcher();
    let initCode: Buffer;
    let contractName: string | undefined;
    let compilerInput: CompilerInput | undefined;
    let submitPromise: Promise<void> | undefined;
    let pendingTx : PendingTransaction | undefined;
    let receipt: TransactionReceipt | undefined;
    let addressUrl: string | undefined;
    let txUrl: string | undefined;
    let error: string | undefined;

    $: {
        if (pendingTx) {
            txUrl = `${EXPLORERS[wallet.chainId]}/tx/${pendingTx.txhash}`;
        } else {
            txUrl = undefined;
        }
    }

    $: {
        if (receipt) {
            addressUrl = `${EXPLORERS[wallet.chainId]}/address/${receipt.contractAddress}`;
            wrapperAddress = receipt.contractAddress!;
        } else {
            addressUrl = undefined;
        }
    }

    function isValidContractName(name: string | undefined): boolean {
        return !!name && /^[a-z_][a-z0-9_]*$/.test(name);
    }

    function closeHandler() {
        dispatch('close');
    }

    function submitHandler() {
        submitPromise = (async () => {
            if (selfExtractingZipAddress && isValidContractName(contractName)) {
                try {
                    const r = await buildVerifiableForwarder(
                        selfExtractingZipAddress,
                        contractName!,
                        unzippedContractAbi,
                    );
                    initCode = r.initCode;
                    compilerInput = r.compilerInput;
                    pendingTx = await wallet.deploy(initCode);
                    receipt = await pendingTx.wait();
                } catch (err) {
                    console.error(err);
                } finally {
                    submitPromise = undefined;
                }
            }
        })();
    }
</script>

<style lang="scss">
    :root {
        --emphasis-color: inherit;
    }

    .content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1em;

        > .message {
            max-width: 62ex;
            overflow: hidden;

            > .network {
                color: var(--emphasis-color);
            }
        }
        > .actions {
            width: 100%;
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
            gap: 2ex;
            justify-content: center;
        }

        .address {
            word-wrap: break-word;
        }
    }
</style>

<div class="content">
    <div class="message">
        {#if receipt}
            Deployed wrapper contract at
            <a href={addressUrl} target="_blank" class="address"><!--
                -->{receipt.contractAddress}<!--
            --></a>!
        {:else if pendingTx || submitPromise}
            Deploying wrapper contract on
            <span class="network">{NETWORK_NAMES[wallet.chainId]}</span><!--
            -->{#if txUrl} (<a href="{txUrl}" target="_blank">tx</a>){/if}...
        {:else}
            Do you want to deploy a wrapper for a zipped contract?
            You only need to do this if you want people to be able to interact
            with your contract on etherscan.
            <input type="text" placeholder="Contract Name" bind:value={contractName} />
            {#if isValidContractName(contractName)}
                Deploy a {
                    `${(initCode.length / 1000).toFixed(1)}KB`
                } wrapper contract on
                <span class="network">{NETWORK_NAMES[wallet.chainId]}</span>?
            {/if}
        {/if}
    </div>
    <div class="error">
        {#if error}
            { error }
        {/if}
    </div>
    <div class="actions">
        {#if receipt}
            <span class="action">
                [<a href="" on:click|preventDefault={closeHandler}>OK</a>]
            </span>
        {:else if pendingTx || submitPromise}
            <ProgressSpinner />
        {:else}
            {#if isValidContractName(contractName)}
                <span class="action">
                    [<a href="" on:click|preventDefault={submitHandler}>Submit</a>]
                </span>
            {/if}
            <span class="action">
                [<a href="" on:click|preventDefault={closeHandler}>Cancel</a>]
            </span>
        {/if}
    </div>
</div>
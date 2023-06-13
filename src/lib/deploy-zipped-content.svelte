<script lang="ts">
    import type { Address, TransactionReceipt } from "viem";
    import type { PendingTransaction, Wallet } from "./wallet";
    import { createEventDispatcher } from "svelte";
    import ProgressSpinner from "./progress-spinner.svelte";
    import { EXPLORERS, NETWORK_NAMES } from "./constants";
    import type { Buffer } from 'buffer/';
    import AddressLink from "./address-link.svelte";

    export let initCode: Buffer;
    export let wallet: Wallet;
    export let selfExtractingZipAddress: Address | undefined;
    const dispatch = createEventDispatcher();
    let submitPromise: Promise<void> | undefined;
    let pendingTx : PendingTransaction | undefined;
    let receipt: TransactionReceipt | undefined;
    let addressUrl: string | undefined;
    let txUrl: string | undefined;
    let error: string | undefined;
    let CACHE = {
        // Break reactivity for deploy chain id.
        deployChainId: 1 as number,
    };

    $: {
        if (pendingTx) {
            CACHE.deployChainId = wallet.chainId;
            CACHE = CACHE;
            txUrl = `${EXPLORERS[wallet.chainId]}/tx/${pendingTx.txhash}`;
        } else {
            txUrl = undefined;
        }
    }

    $: {
        if (receipt) {
            addressUrl = `${EXPLORERS[CACHE.deployChainId]}/address/${receipt.contractAddress}`;
            selfExtractingZipAddress = receipt.contractAddress!;
        } else {
            addressUrl = undefined;
        }
    }

    function closeHandler() {
        dispatch('close');
    }

    function submitHandler() {
        submitPromise = (async () => {
            error = undefined;
            try {
                pendingTx = await wallet.deploy(initCode);
                receipt = await pendingTx.wait();
            } catch (err: any) {
                if (err.message !== 'user rejected tx') {
                    error = err.message;
                    console.error(err);
                }
            } finally {
                submitPromise = undefined;
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
        > .error {
            color: red;
        }
    }
</style>

<div class="content">
    <div class="message">
        {#if receipt && receipt.contractAddress && addressUrl}
            Deployed zipped contract at
            <a href={addressUrl} target="_blank" class="address"><!--
                --><AddressLink url={addressUrl} address={receipt.contractAddress} /><!--
            --></a>!
        {:else if pendingTx || submitPromise}
            Deploying zipped contract on
            <span class="network">{NETWORK_NAMES[wallet.chainId]}</span><!--
            -->{#if txUrl} (<a href="{txUrl}" target="_blank">tx</a>){/if}...
        {:else}
            Deploy a {
                `${(initCode.length / 1000).toFixed(1)}KB`
            } zipped contract on
            <span class="network">{NETWORK_NAMES[wallet.chainId]}</span>?
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
            <span class="action">
                [<a href="" on:click|preventDefault={submitHandler}>Submit</a>]
            </span>
            <span class="action">
                [<a href="" on:click|preventDefault={closeHandler}>Cancel</a>]
            </span>
        {/if}
    </div>
</div>
<script lang="ts">
    import type { Address, TransactionReceipt } from "viem";
    import type { PendingTransaction, Wallet } from "./wallet";
    import { createEventDispatcher } from "svelte";
    import ProgressSpinner from "./progress-spinner.svelte";
    import { EXPLORERS, NETWORK_NAMES } from "./constants";
    import type { Buffer } from 'buffer/';

    export let initCode: Buffer;
    export let wallet: Wallet;
    export let selfExtractingZipAddress: Address | undefined;
    const dispatch = createEventDispatcher();
    let submitPromise: Promise<void> | undefined;
    let pendingTx : PendingTransaction | undefined;
    let receipt: TransactionReceipt | undefined;
    let addressUrl: string | undefined;
    let txUrl: string | undefined;

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
            try {
                pendingTx = await wallet.deploy(initCode);
                receipt = await pendingTx.wait();
            } catch (err) {
                console.error(err);
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

        .address {
            word-wrap: break-word;
        }
    }
</style>

<div class="content">
    <div class="message">
        {#if receipt}
            Deployed zipped contract at
            <a href={addressUrl} target="_blank" class="address"><!--
                -->{receipt.contractAddress}<!--
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
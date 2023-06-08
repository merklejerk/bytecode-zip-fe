<script lang="ts">
    import type { Abi, Address, TransactionReceipt } from "viem";
    import type { PendingTransaction, Wallet } from "./wallet";
    import { createEventDispatcher } from "svelte";
    import ProgressSpinner from "./progress-spinner.svelte";
    import { ADDRESS_PATTERN, CONTRACT_NAME_PATTERN, EXPLORERS, NETWORK_NAMES } from "./constants";
    import type { CompilerInput } from "./worker-compiler";
    import { buildVerifiableForwarder } from "./runtime";

    export let wallet: Wallet;
    export let selfExtractingZipAddress: Address | undefined = undefined;
    export let unzippedContractAbi: Abi;
    export let wrapperAddress: Address | undefined = undefined;
    const dispatch = createEventDispatcher();
    let contractName: string | undefined;
    let compilerInput: CompilerInput | undefined;
    let submitPromise: Promise<void> | undefined;
    let pendingTx : PendingTransaction | undefined;
    let receipt: TransactionReceipt | undefined;
    let addressUrl: string | undefined;
    let txUrl: string | undefined;
    let error: string | undefined;
    let explicitSelfExtractingZipAddress: Address | undefined = undefined;

    $: {
        if (selfExtractingZipAddress) {
            explicitSelfExtractingZipAddress = selfExtractingZipAddress;
        }
    }

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
        return !!name && CONTRACT_NAME_PATTERN.test(name);
    }
   
    function isValidAddress(v: string | undefined): boolean {
        return !!v && ADDRESS_PATTERN.test(v);
    }

    function closeHandler() {
        dispatch('close');
    }

    function submitHandler() {
        submitPromise = (async () => {
            if (explicitSelfExtractingZipAddress && isValidContractName(contractName)) {
                try {
                    const r = await buildVerifiableForwarder(
                        explicitSelfExtractingZipAddress,
                        contractName!,
                        unzippedContractAbi,
                    );
                    compilerInput = r.compilerInput;
                    pendingTx = await wallet.deploy(r.initCode);
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
    @import "$lib/common.scss";

    :root {
        --emphasis-color: inherit;
    }

    .content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5em;

        > .message {
            max-width: 62ex;
            overflow: hidden;

            .network {
                color: var(--emphasis-color);
            }

            form {
                display: flex;
                flex-direction: column;
                margin-top: 1.5em;
                gap: 1.5em;
                > div {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.5em;

                    @media (min-width: map-get($breakpoints, "lg")) {
                        flex-direction: row;
                        align-items: center;
                    }
                }
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

        input.invalid {
            background-color: #dfb0b0;
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
            <div class="notice">
                Do you want to deploy a wrapper for a zipped contract on
                <span class="network">{NETWORK_NAMES[wallet.chainId]}</span>?
                You only need to do this if you want to interact
                with your contract on etherscan.
            </div>
            <form>
                <div>
                    <label class="address-input" for="zip-address">
                        Where is the zipped contract deployed?
                    </label>
                    <input
                        autofocus 
                        type="text"
                        id="zip-address"
                        placeholder="Zipped address"
                        on:paste|stopPropagation
                        class:invalid={
                            explicitSelfExtractingZipAddress &&
                            !isValidAddress(explicitSelfExtractingZipAddress)
                        }
                        bind:value={explicitSelfExtractingZipAddress} />
                </div>
                <div>
                    <label class="address-input" for="contract-name">
                        What do you want to name this contract?
                    </label>
                    <input
                        autofocus={!!explicitSelfExtractingZipAddress}
                        type="text"
                        id="contract-name"
                        placeholder="Contract name"
                        class:invalid={contractName && !isValidContractName(contractName)}
                        bind:value={contractName} />
                </div>
            </form>
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
            {#if isValidContractName(contractName) && isValidAddress(explicitSelfExtractingZipAddress)}
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
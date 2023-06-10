<script lang="ts">
    import type { Abi, Address, TransactionReceipt } from "viem";
    import type { PendingTransaction, Wallet } from "./wallet";
    import { createEventDispatcher } from "svelte";
    import ProgressSpinner from "./progress-spinner.svelte";
    import { ADDRESS_PATTERN, CONTRACT_NAME_PATTERN, EXPLORERS, NETWORK_NAMES } from "./constants";
    import { COMPILER_VERSION, type CompilerInput } from "./worker-compiler";
    import { buildVerifiableForwarder } from "./runtime";
    import AddressLink from "./address-link.svelte";
    import DosButton from "./dos-button.svelte";
    import { verifyContract } from "./verify";

    export let wallet: Wallet;
    export let selfExtractingZipAddress: Address | undefined;
    export let unzippedContractAbi: Abi;
    export let wrapperAddress: Address | undefined = undefined;
    const dispatch = createEventDispatcher();
    let contractName: string | undefined;
    let compilerInput: CompilerInput | undefined;
    let submitPromise: Promise<void> | undefined;
    let verifyPromise: Promise<void> | undefined;
    let pendingTx : PendingTransaction | undefined;
    let receipt: TransactionReceipt | undefined;
    let txUrl: string | undefined;
    let wrapperAddressUrl: string | undefined;
    let error: string | undefined;
    let explicitSelfExtractingZipAddress: Address | undefined = undefined;
    let etherscanApiKey: string | undefined;
    let isVerified: boolean = false;
    let CACHE = {
        // Break reactivity for deploy chain id.
        deployChainId: 1 as number,
    };

    $: {
        if (selfExtractingZipAddress) {
            explicitSelfExtractingZipAddress = selfExtractingZipAddress;
        }
    }

    $: {
        if (pendingTx) {
            CACHE.deployChainId = wallet.chainId;
            CACHE = CACHE;
            txUrl = `${EXPLORERS[CACHE.deployChainId!]}/tx/${pendingTx.txhash}`;
        } else {
            txUrl = undefined;
        }
    }

    $: {
        if (receipt) {
            wrapperAddressUrl = `${EXPLORERS[CACHE.deployChainId]}/address/${receipt.contractAddress}`;
            wrapperAddress = receipt.contractAddress!;
        } else {
            wrapperAddressUrl = undefined;
        }
    }

    function isValidContractName(name: string | undefined): boolean {
        return !!name && CONTRACT_NAME_PATTERN.test(name);
    }
   
    function isValidAddress(v: string | undefined): boolean {
        return !!v && ADDRESS_PATTERN.test(v);
    }

    function isValidApiKey(v: string | undefined): boolean {
        return !!v;
    }

    function closeHandler() {
        dispatch('close');
    }

    function deployHandler() {
        submitPromise = (async () => {
            if (explicitSelfExtractingZipAddress && isValidContractName(contractName)) {
                error = undefined;
                try {
                    const r = await buildVerifiableForwarder(
                        explicitSelfExtractingZipAddress,
                        contractName!,
                        unzippedContractAbi,
                    );
                    compilerInput = r.compilerInput;
                    pendingTx = await wallet.deploy(r.initCode);
                    receipt = await pendingTx.wait();
                } catch (err: any) {
                    if (err.message !== 'user rejected tx') {
                        error = err.message;
                        console.error(err);
                    }
                } finally {
                    submitPromise = undefined;
                }
            }
        })();
    }

    function verifyHandler() {
        verifyPromise = (async () => {
            error = undefined;
            try {
                await verifyContract(
                    EXPLORERS[CACHE.deployChainId],
                    etherscanApiKey!,
                    wrapperAddress!,
                    contractName!,
                    compilerInput!,
                    COMPILER_VERSION,
                );
                isVerified = true;
            } catch (err: any) {
                error = err.message;
                console.error(err);
            } finally {
                verifyPromise = undefined;
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

            form.verify-form {
                text-align: center;
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
        input.invalid {
            background-color: #dfb0b0;
        }
    }
</style>

<div class="content">
    <div class="message">
        {#if isVerified && wrapperAddress && wrapperAddressUrl}
            The wrapper contract at
            <AddressLink url={wrapperAddressUrl} address={wrapperAddress} />
            has been successfully verified!
        {:else if wrapperAddress && wrapperAddressUrl}
            The wrapper contract has been deployed at
            <AddressLink url={wrapperAddressUrl} address={wrapperAddress} />
            and now needs to be verified. Provide an etherscan API key to perform
            this verification.
            <form class="verify-form">
                <label for="etherscan-api-key">
                    <input
                        autofocus
                        placeholder="Etherscan API key"
                        type="text"
                        id="etherscan-api-key"
                        bind:value={etherscanApiKey} />
                </label>
            </form>
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
                    <label for="zip-address">
                        Where is the zipped contract deployed?
                    </label>
                    <input
                        autofocus 
                        type="text"
                        id="zip-address"
                        placeholder="Zipped address"
                        class:invalid={
                            explicitSelfExtractingZipAddress &&
                            !isValidAddress(explicitSelfExtractingZipAddress)
                        }
                        bind:value={explicitSelfExtractingZipAddress} />
                </div>
                <div>
                    <label for="contract-name">
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
        {#if isVerified}
               <DosButton on:click={closeHandler}>OK</DosButton>
        {:else if verifyPromise}
            <ProgressSpinner />
        {:else if wrapperAddress}
                <DosButton on:click={verifyHandler} disabled={!isValidApiKey(etherscanApiKey)}>Verify</DosButton>
        {:else if pendingTx || submitPromise}
            <ProgressSpinner />
        {:else}
            <DosButton
                on:click={deployHandler}
                disabled={!isValidContractName(contractName) || !isValidAddress(explicitSelfExtractingZipAddress)}
                >Deploy</DosButton>
            <DosButton
                on:click={closeHandler}
            >Cancel</DosButton>
        {/if}
    </div>
</div>
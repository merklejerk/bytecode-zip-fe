<script lang="ts" context="module">
    import { MetamaskWallet, Wallet } from "$lib/wallet";
    import { readable } from "svelte/store";

    let currentWallet: Wallet | undefined;
    let setWallet: (w: Wallet | undefined) => void;

    export const wallet = readable<Wallet | undefined>(
        undefined,
        (setter) => {
            const onDisconnected = () => {
                setWallet(undefined);
            };
            const onChanged = () => {
                setWallet(currentWallet);
            };
            setWallet = (w: Wallet | undefined) => {
                if (currentWallet && currentWallet !== w) {
                    currentWallet.removeListener('disconnect', onDisconnected);
                    currentWallet.removeListener('change', onChanged);
                }
                if (w && currentWallet !== w) {
                    w.addListener('disconnect', onDisconnected);
                    w.addListener('change', onChanged);
                }
                setter(currentWallet = w);
            };
        },
    );
</script>

<script lang="ts">

    export let error: string | undefined;
    let desiredWalletType: string = 'metamask';

    async function connectHandler() {
        const w = await MetamaskWallet.create();
        setWallet(w);
    }
</script>

<style lang="scss">
    .content {
        .error {
            color: #aa4b4b;
        }
        > *:not(:last-child) {
            margin-bottom: 0.75em;
        }
        > form {
            > *:not(:last-child) {
                margin-bottom: 0.75em;
            }
            > .options {
                display: flex;
                flex-direction: column;
                flex-wrap: wrap;
            }
            > .submit {
                text-align: center;
                white-space: nowrap;

                > .already {
                    opacity: 0.5;
                }
            }
        }
    }
</style>

<div class="content">
    <div class="title">Connect your wallet to continue:</div>
    <form id="connect-wallet">
        <div class="options">
            <label><input type="radio" bind:group={desiredWalletType} name="wallet-type" value="metamask" checked /> Metamask</label>
            <!-- <label><input type="radio" bind:group={desiredWalletType} name="wallet-type" value="wc" /> WalletConnect</label> -->
        </div>
        <div class="submit">
            {#if $wallet && $wallet.type === desiredWalletType}
                {#if error}
                    <div class="error">[!!] {error}</div>
                {/if}
            {:else}
            [<a href="" on:click|preventDefault={connectHandler}>Connect</a>]
            {/if}
        </div>
    </form>
</div>

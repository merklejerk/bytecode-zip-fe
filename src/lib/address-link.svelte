<script lang="ts">
    import type { Address } from "viem";

    export let url: string;
    export let address: Address;
    let content: string;

    $: content = `${address.slice(0, 5)}..${address.slice(-3)}`;
</script>

<style lang="scss">
    a {
        word-wrap: break-word;
    }
</style>

<a href={url} target="_blank">{ content }</a>
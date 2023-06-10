<script lang="ts">
    import { createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher();
    export let disabled: boolean = false;
    
    function clickHandler(e: Event) {
        if (!disabled) {
            dispatch('click');
        }
    }
</script>

<style lang="scss">
    a.disabled {
        color: #999;
    }
</style>

<span>[<a
    href={disabled ? undefined : ""}
    on:click|preventDefault|stopPropagation={clickHandler}
    class:disabled={!!disabled}><slot /></a>]</span>


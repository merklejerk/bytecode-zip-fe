<script lang="ts">
    import { createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher();
    export let buttonText = 'OK';

    function closeHandler() {
        dispatch('close');
    }
</script>

<style lang="scss">
    .content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1em;

        > .message {
            max-width: 62ex;
            overflow: hidden;
        }
    }
</style>

<div class="content">
    <div class="message">
        <slot />
    </div>
    <div class="actions">
        <span class="action">
            [<a href="" on:click|preventDefault={closeHandler}>{buttonText}</a>]
        </span>
    </div>
</div>
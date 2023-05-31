<script lang="ts">
    export let hex: string | undefined;
    export let wordSize: number = 2;
    let words: string[];

    $: {
        const hex_ = hex || '';
        const numBytes = Math.floor(hex_.length / 2);
        words = new Array<string>(Math.ceil(Math.min(numBytes, 1280) / wordSize));
        for (let i = 0; i < words.length; ++i) {
            const o = i * wordSize * 2;
            words[i] = hex_.slice(o, o + wordSize * 2);
        }
    }
    $: {
    }
</script>

<style lang="scss">
    .root {
        display: flex;
        flex-direction: row;
        gap: 0 1ex;

        > .offsets {
            flex: 0;
            color: var(--text-color2, white);
            text-transform: uppercase;
        }

        > .words {
            flex: 1;
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
            gap: 0 3ex;
            justify-content: end;
            color: var(--text-color1);
            text-transform: uppercase;
        }

        > .empty {
            > .caret {
                display: inline-block;
                background-color: var(--text-color1, white);
                width: 1.25ex;
                height: 1.75ex;
                margin-top: 0.15em;
                animation: blink-animation 1s steps(2, start) infinite;
            }
        }
    }
    
    @keyframes blink-animation {
        to {
            visibility: hidden;
        }
    }
</style>

<div class="root">
    <div class="offsets">
        {#each new Array(100) as _, idx}
        <div class="offset">{ (idx * wordSize).toString(16).padStart(4, '0') }:</div>
        {/each}
    </div>
    {#if hex}
        <div class="words">
            {#each words as word}
            <div class="word">{word}</div>
            {/each}
        </div>
    {:else}
        <div class="empty">
            <span class="caret" />
        </div>
    {/if}
</div>


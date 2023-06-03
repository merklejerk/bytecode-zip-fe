<script lang="ts">
    import { onMount } from "svelte";

    export let hex: string | undefined;
    export let wordSize: number = 2;
    let words: string[];
    let wordsElement: HTMLDivElement | undefined;
    let rowStride: number = 32;
    let wordsResizerObserver: ResizeObserver;

    $: {
        const hex_ = hex || '';
        const numBytes = Math.floor(hex_.length / 2);
        words = new Array<string>(Math.ceil(Math.min(numBytes, 3192) / wordSize));
        for (let i = 0; i < words.length; ++i) {
            const o = i * wordSize * 2;
            words[i] = hex_.slice(o, o + wordSize * 2);
        }
    }
    $: {
        if (wordsResizerObserver) {
            wordsResizerObserver.disconnect()
            if (wordsElement) {
                wordsResizerObserver.observe(wordsElement);
            }
        }
    }

    function fromPx(s: string): number {
        return Number(s.slice(0, -2));
    }

    onMount(() => {
        wordsResizerObserver = new ResizeObserver(() => {
            if (!wordsElement) {
                return;
            }
            const ch = wordsElement.firstElementChild;
            if (!ch) {
                rowStride = 32;
                return;
            }
            const pcs = window.getComputedStyle(wordsElement);
            const cs = window.getComputedStyle(ch);
            const pw = fromPx(pcs.width);
            const ww = fromPx(cs.width);
            const gap = fromPx(pcs.columnGap);
            let n = Math.floor(pw / ww);
            if (n > 1) {
                for (; n > 2; --n) {
                    if (pw >= (n * ww) + ((n - 1) * gap)) {
                        break;
                    }
                }
            }
            rowStride = n * wordSize;
        });
    });
</script>

<style lang="scss">
    .root {
        display: flex;
        flex-direction: row;
        gap: 0 1ex;
        align-items: start;

        > .offsets {
            flex: 0;
            color: var(--text-color2, white);
            text-transform: uppercase;
            display: flex;
            flex-direction: column;
            gap: 0.25em 0;
        }

        > .words {
            flex: 1;
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
            gap: 0.25em 3ex;
            align-items: start;
            justify-content: start;
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
            }
        }
    }
</style>

<div class="root">
    <div class="offsets">
        {#each new Array(100) as _, idx}
        <div class="offset">{ (idx * rowStride).toString(16).padStart(4, '0') }&gt;</div>
        {/each}
    </div>
    {#if hex}
        <div class="words" bind:this={wordsElement}>
            {#each words as word}
            <div class="word">{word}</div>
            {/each}
        </div>
    {:else}
        <div class="empty">
            <span class="caret blink" />
        </div>
    {/if}
</div>


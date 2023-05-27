<script lang="ts">
    let bytecode: string | undefined;
    let textInput: HTMLDivElement;

    function pasteHandler(e: ClipboardEvent) {
        bytecode = e.clipboardData?.getData("text")
            .replaceAll(/\s+/g, '');
        console.log('foo', bytecode);
    }

    function dropHandler(e: DragEvent) {
        console.log(e.dataTransfer?.files);
    }

    function keyHandler(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            bytecode = undefined;
        }
    }
</script>
<style lang="scss">
    :root {
        --console-text-color: rgb(108, 121, 112);
    }
    main {
        height: 100vh;
        padding: 0;
        margin: 0;
        background-color: rgb(44, 30, 32);
        position: fixed;
        font-family: 'Atari';
        
        .text-input {
            color: var(--console-text-color);
            margin: 0;
            padding: 0;
            font-size: 2em;
            caret-color: transparent;
            border: 0;
            white-space: break-spaces;
            word-break: break-all;
            overflow: hidden;
            line-height: 1em;
            max-height: 100%;
            min-height: 100%;
            user-select: none;

            .caret {
                display: inline-block;
                background-color: var(--console-text-color);
                width: 1ex;
                height: 1.25ex;
                margin-left: 0.25ex;
                animation: blink-animation 1s steps(2, start) infinite;
            }
        }

        .crt-effect-1 {
            --crt-glow-1: 196, 146, 194;

            position: absolute;
            inset: 0;
            // background: url('/crt-effect-1.svg') center;
            // background-size: 105% 105%;
            // mix-blend-mode: multiply;
            display: flex;
            flex-direction: column;
            justify-content: space-evenly;
            gap: 1em;
            box-shadow: inset 0 0 min(10vh,10vw) rgba(27, 2, 10, 0.75);
            
            .crt-line {
                width: 100%;
                height: 0.1em;
                box-shadow: 0 0 1em rgba(var(--crt-glow-1), 0.05);
                background-color: rgba(var(--crt-glow-1), 0.0075);
            }
            .crt-scan-line {
                animation: scan-line-animation 2s linear 0s infinite;
                position: absolute;
                width: 100%;
                height: 10em;
                background-image: linear-gradient(
                    rgba(var(--crt-glow-1), 0) 0%,
                    rgba(var(--crt-glow-1), 0.05) 85%,
                    rgba(var(--crt-glow-1), 0.075) 99%,
                    rgba(var(--crt-glow-1), 0.33) 100%
                );
            }
        }
    }
    
    @keyframes scan-line-animation {
        from {
            top: calc(0% - 10em);
        }
        to {
            top: 100%;
        }
    }

    @keyframes blink-animation {
        to {
            visibility: hidden;
        }
    }
</style>

<svelte:document on:paste|preventDefault={pasteHandler} on:keyup={keyHandler} />
<main>
    <div
        bind:this={textInput}
        class="text-input"
        on:scroll|stopPropagation|preventDefault={() => textInput.scrollTop = 0}
        on:resize={() => textInput.scrollTop = 0}
        on:drop|stopPropagation|preventDefault={dropHandler}
        on:dragover|preventDefault|stopPropagation
    >
        {#if bytecode}
            { bytecode }
        {:else}
            <span class="caret" />
        {/if}
    </div>
    <div class="crt-effect-1">
        {#each new Array(15) as n}
            <div class="crt-line" />
        {/each}
        <div class="crt-scan-line" />
    </div>
</main>

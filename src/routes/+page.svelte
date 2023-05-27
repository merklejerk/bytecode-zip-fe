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
        console.log(e.code);
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            bytecode = undefined;
        }
    }
</script>
<style lang="scss">
    main {
        height: 100vh;
        padding: 0;
        margin: 0;
        background-color: rgb(82, 59, 82);
        position: fixed;
        font-family: 'Atari';
        
        .text-input {
            color: rgb(108, 121, 112);
            margin: 0;
            padding: 0;
            font-size: 3em;
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

<svelte:document on:paste|preventDefault={pasteHandler} on:keyup={keyHandler} />
<main>
    <div
        bind:this={textInput}
        class="text-input"
        on:scroll|stopPropagation|preventDefault={() => textInput.scrollTop = 0}
        on:resize={() => textInput.scrollTop = 0}
        on:drop|stopPropagation|preventDefault={dropHandler}
        on:dragover|preventDefault|stopPropagation
    >{#if bytecode}{ bytecode }{:else}<span class="caret">▊</span>{/if}</div>
</main>

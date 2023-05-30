<script lang="ts">
    import { browser } from "$app/environment";
    import { onMount } from "svelte";
    import Panel from "../lib/panel.svelte";
    
    const COLORS = {
        '--console-text-color1': 'white',
        '--console-text-color2': '#fdfd55',
        '--console-bg-color': '#0000aa',
        '--ctrl-fg-color': '#111',
        '--ctrl-bg-color': '#c0c0c0',
    };

    let rootStyles: Record<string, string> = {
        ...COLORS,
        height: '100vh',
    };
    let bytecode: string | undefined;
    let textInput: HTMLDivElement;
    let status: string | undefined;

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

    onMount(() => {
        const resizeHandler = () => {

            rootStyles.height = `${window.innerHeight + 0.5}px`;
        };
        window.addEventListener('resize', resizeHandler);
        resizeHandler();
    });
</script>
<style lang="scss">
    @import "@picocss/pico/scss/pico.scss";

    .hidden {
        display: none;
    }
    main {
        height: 100vh;
        padding: 0;
        margin: 0;
        background-color: var(--console-bg-color);
        position: fixed;
        font-family: 'Atari';
        color: var(--console-text-color1);
        
        > .editor {
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

        }
        .display {
            position: absolute;
            inset: 0;
            display: flex;
            flex-direction: row;
            justify-content: center;
            align-items: center;
        }
        .display.modal {
            .hello {
                text-align: start;
                align-self: center;
                color: var(--ctrl-fg-color);
                * {
                    color: inherit;
                }
            }
            .progress {
                background-color: rgb(108 161 139);
                text-align: center;
            }
        }
        .display.app {
            display: grid;
            grid-template: 10fr auto 6fr 1.5em / 1fr;
            grid-template-areas: "editor"
                                 "separator"
                                 "side-pane"
                                 "status-bar";
            align-items: start;
            
            @media (min-width: map-get($breakpoints, "lg")) {
                grid-template: 1fr 1.5em / 10fr auto 4fr;
                grid-template-areas: "editor separator side-pane"
                                     "status-bar status-bar status-bar";
            }
            > .editor {
                grid-area: editor;
                > .caret {
                    display: inline-block;
                    background-color: var(--console-text-color1);
                    width: 1.25ex;
                    height: 1.75ex;
                    margin-left: 0.25ex;
                    animation: blink-animation 1s steps(2, start) infinite;
                }
            }
            > .side-pane {
                grid-area: side-pane;
            }
            > .separator {
                grid-area: separator;
                height: 100%;
                width: 100%;
                display: flex;
                flex-direction: column;
                align-items: stretch;
                justify-content: stretch;
                margin: 1em 0;
                @media (min-width: map-get($breakpoints, "lg")) {
                    flex-direction: row;
                    margin: 0 1em;
                }

                > * {
                    background-color: var(--console-text-color1);
                    width: auto;
                    height: 0.25em;
                    margin: 0 1em;
                    @media (min-width: map-get($breakpoints, "lg")) {
                        width: 0.25em;
                        height: auto;
                        margin: 1em 0;
                    }
                }
            }
            > .status-bar {
                grid-area: status-bar;
                padding: 1em;
                background-color: var(--ctrl-bg-color);
                text-align: center;
            }
        }
        > .crt-effect-1 {
            --crt-glow-1: 196, 146, 194;

            pointer-events: none;
            position: absolute;
            inset: 0;
            display: flex;
            flex-direction: column;
            justify-content: space-evenly;
            gap: 1em;
            box-shadow: inset 0 0 min(10vh,10vw) rgba(27, 2, 10, 0.5);
            
            > .crt-line {
                width: 100%;
                height: 0.15em;
                box-shadow: 0 0 1em rgba(var(--crt-glow-1), 0.6);
            }
            > .crt-scan-line {
                animation: scan-line-animation 2s linear 0s infinite;
                position: absolute;
                width: 100%;
                height: 10em;
                background-image: linear-gradient(
                    rgba(var(--crt-glow-1), 0) 0%,
                    rgba(var(--crt-glow-1), 0.08) 85%,
                    rgba(var(--crt-glow-1), 0.1) 99%,
                    rgba(var(--crt-glow-1), 0.5) 100%
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
<main style={Object.entries(rootStyles).map(([k,v]) => `${k}:${v}`).join(';')}>
    <div
        bind:this={textInput}
        class="editor"
        on:scroll|stopPropagation|preventDefault={() => textInput.scrollTop = 0}
        on:resize={() => textInput.scrollTop = 0}
        on:drop|stopPropagation|preventDefault={dropHandler}
        on:dragover|preventDefault|stopPropagation
    >
    </div>
    <div class="display">
        <div class="display app">
            <div class="editor">
                {#if bytecode}
                    { bytecode }
                {:else}
                    <span class="caret" />
                {/if}
            </div>
            <div class="separator"><div /></div>
            <div class="side-pane">foo</div>
            <div class="status-bar">{#if status}{status}{:else}{@html '&nbsp;' }{/if}</div>
        </div>
        <div class="display modal">
            <Panel title="bytecode.zip" --bg-color={COLORS["--ctrl-bg-color"]}>
                <div class="hello" class:hidden={!!bytecode}>
                    To begin you can either:
                    <br />
                    <br />
                    <ul>
                        <li>Paste initcode (hex)</li>
                        <li>Paste solc build artifact (JSON)</li>
                        <li>Drop solc build artifact (JSON)</li>
                    </ul>
                </div>
                <div class="progress" class:hidden={!bytecode}>
                    Hello, world!
                </div>
            </Panel>
        </div>
    </div>
    <div class="crt-effect-1">
        {#each new Array(15) as n}
            <div class="crt-line" />
        {/each}
        <div class="crt-scan-line" />
    </div>
</main>

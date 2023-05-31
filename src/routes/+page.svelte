<script lang="ts">
    import { browser } from "$app/environment";
    import { onMount } from "svelte";
    import Panel from "../lib/panel.svelte";
    import HexEditor from "../lib/hex-editor.svelte";
    
    const COLORS = {
        '--console-text-color1': 'white',
        '--console-text-color2': '#fdfd55',
        '--console-text-color3': '#9dfaff',
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
   
    $: status = bytecode ? '<ESC> to clear' : 'Waiting for input...';

    function pasteHandler(e: ClipboardEvent) {
        bytecode = e.clipboardData?.getData("text")
            .replaceAll(/\s+/g, '');
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

    main {
        height: 100vh;
        padding: 0;
        margin: 0;
        background-color: var(--console-bg-color);
        position: fixed;
        font-family: 'Atari';
        color: var(--console-text-color1);
        
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
            grid-template: 10fr 6fr minmax(1.5em, auto) / 1fr;
            grid-template-areas: "editor"
                                 "info-pane"
                                 "status-bar";
            align-items: start;
            @media (min-width: map-get($breakpoints, "lg")) {
                grid-template: 1fr minmax(1.5em, auto) / 10fr 4fr;
                grid-template-areas: "editor info-pane"
                                     "status-bar status-bar";
                                
            }

            > * {
                min-width: 0;
                min-height: 0;
                height: 100%;
                width: 100%;
                overflow: hidden;
            }
            > .editor {
                grid-area: editor;
                padding: 0 1ex;
            }
            > .info-pane {
                grid-area: info-pane;
                align-self: center;
                justify-self: center;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                @media (min-width: map-get($breakpoints, "lg")) {
                    flex: 0 1 25vh;
                    align-self: start;
                }

                :global(> * > *) {
                    flex: 1 1 auto;
                    width: 100%;
                }
            
                .details {
                    // width: auto;
                }
            }
            > .status-bar {
                grid-area: status-bar;
                padding: 0.1em;
                background-color: var(--ctrl-bg-color);
                color: var(--ctrl-fg-color);
                text-align: center;
            }
        }
        > .crt-effect-1 {
            --crt-glow-1: 215, 146, 194;

            pointer-events: none;
            position: absolute;
            inset: 0;
            display: flex;
            flex-direction: column;
            justify-content: space-evenly;
            gap: 1em;
            box-shadow: inset 0 0 min(10vh, 10vw) rgba(27, 2, 10, 0.5);
            
            > .crt-line {
                width: 100%;
                height: 0.15em;
                box-shadow: 0 0 1em rgba(var(--crt-glow-1), 0.6);
            }
            > .crt-scan-line {
                animation: scan-line-animation 2s linear 0s infinite;
                position: absolute;
                width: 100%;
                height: 33vh;
                margin: -33vh 0 0 0;
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
            top: 0;
        }
        to {
            top: calc(100% + 33vh);
        }
    }

</style>

<svelte:document on:paste|preventDefault={pasteHandler} on:keyup={keyHandler} />
<main
    style={Object.entries(rootStyles).map(([k,v]) => `${k}:${v}`).join(';')}
    on:drop|stopPropagation|preventDefault={dropHandler}
    on:dragover|preventDefault|stopPropagation
>
    <div class="display">
        <div class="display app">
            <div class="editor">
                <HexEditor
                    hex={bytecode}
                    --text-color1={COLORS['--console-text-color1']}
                    --text-color2={COLORS['--console-text-color2']} />
            </div>
            <!-- <div class="separator"><div /></div> -->
            <div class="info-pane">
                <Panel
                title="INFO"
                    --frame-color={COLORS['--console-text-color1']}
                    --bg-color={COLORS['--console-bg-color']}>
                    <div class="details">
                        Compression....
                    </div>
                </Panel>
            </div>
            <div class="status-bar">
                {#if status}{status}{:else}{@html '&nbsp;' }{/if}
            </div>
        </div>
        {#if !bytecode}
        <div class="display modal">
                <Panel
                    title="BYTECODE.ZIP"
                    --bg-color={COLORS["--ctrl-bg-color"]}
                    raised>
                    <div class="hello">
                        To begin you can either:
                        <br />
                        <br />
                        <ul>
                            <li>Paste initcode (hex)</li>
                            <li>Paste solc build artifact (JSON)</li>
                            <li>Drop solc build artifact (JSON)</li>
                        </ul>
                    </div>
                </Panel>
            </div>
        {/if}
    </div>
    <div class="crt-effect-1">
        {#each new Array(15) as n}
            <div class="crt-line" />
        {/each}
        <div class="crt-scan-line" />
    </div>
</main>

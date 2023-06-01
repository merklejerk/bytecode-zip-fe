<script lang="ts">
    import type { Abi } from 'viem';
    import { onMount } from "svelte";
    import Panel from "../lib/panel.svelte";
    import HexEditor from "../lib/hex-editor.svelte";
    import pako from 'pako';
    import { Buffer } from 'buffer/';
    import { buildRuntime } from '../lib/runtime';
    import { PUBLIC_Z_ADDRESSES_JSON } from '$env/static/public';
    
    const Z_ADDRESSES = JSON.parse(PUBLIC_Z_ADDRESSES_JSON);
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
    let bytecodeHex: string | undefined;
    let unzippedBytecode: Buffer | undefined;
    let zippedBytecode: Buffer | undefined;
    let textInput: HTMLDivElement;
    let status: string | undefined;
    let statusTimer: NodeJS.Timer | undefined;
    let abi: Abi | undefined;
    let infoFields: Record<string, string | number> = {};
    let initCode: Buffer | undefined;
    let deployedAddress: `0x${string}` | undefined;
    let animateZip: (() => void) | undefined;

    $: bytecodeHex = unzippedBytecode?.toString('hex') || undefined;

    $: {
        infoFields = {};
        if (unzippedBytecode) {
            infoFields['Input type'] = abi ? 'artifact' : 'initcode';
            infoFields['Original size'] = `${
                (unzippedBytecode.length / 1e3).toFixed(1)
            }KB`;
            if (zippedBytecode) {
                infoFields['Zipped size'] = `${
                    (zippedBytecode.length / 1e3).toFixed(1)
                }KB`;
                infoFields['Compression'] = `${
                    ((1 - zippedBytecode.length / unzippedBytecode.length) * 100)
                        .toFixed('1')
                }%`;
            }
        }   
    }

    function setArtifactJSON(json: string) {
        let artifact;
        try {
            artifact = JSON.parse(json)
        } catch {
            throw new Error(`Invalid JSON file!`);
        }
        if (typeof(artifact) !== 'object') {
            throw new Error(`Invalid build artifact file!'`);
        }
        abi = artifact.abi;
        setBytecode(getArtifactBytecode(artifact));
    }

    function getArtifactBytecode(artifact: any): string {
        const r = artifact.bytecode?.object ||
            artifact.data.bytecode?.object ||
            artifact.bytecode ||
            artifact.compilerOutput?.bytecode?.object ||
            artifact.creationCode ||
            artifact.initCode;
        if (typeof(r) !== 'string') {
            throw new Error(`Invalid build artifact!`);
        }
        return r;
    }

    function setBytecode(newBytecode: string | undefined) {
        if (newBytecode !== undefined) {
            if (typeof(newBytecode) !== 'string') {
                throw new Error(`Invalid bytecode!`);
            }
            if (newBytecode.match(/^0x/i)) {
                newBytecode = newBytecode.slice(2);
            }
            if (!newBytecode.match(/^([a-f0-9]{2})+$/i)) {
                throw new Error(`Invalid bytecode!`);
            }
        }
        initCode = undefined;
        if (!newBytecode) {
            unzippedBytecode = undefined;
            zippedBytecode = undefined;
            animateZip = undefined;
            return;
        }
        unzippedBytecode = Buffer.from(newBytecode, 'hex');
        zippedBytecode = Buffer.from(pako.deflate(unzippedBytecode, { level: 9 }));
        animateZip = createZipAnimation();
    }

    // buildRuntime(
    //         unzippedBytecode,
    //         zippedBytecode,
    //         Z_ADDRESSES[chainId],
    //         abi ? { abi: abi, name: 'Test' }
    //         ).then(
    //         r => {
    //             initCode = r.initCode;
    //             // ...
    //         }
    //     );

    function createZipAnimation() {
        return ((duration: number) => {
            let startTime = Date.now();
            let tweened = Buffer.alloc(Math.min(
                3192,
                Math.max(
                    unzippedBytecode!.length,
                    zippedBytecode!.length
                ),
            ));
            let tweenedLength = tweened.length;
            return () => {
                if (!unzippedBytecode || !zippedBytecode) {
                    return false;
                }
                const f = (Date.now() - startTime) / duration;
                if (f >= 1) {
                    tweened = zippedBytecode!;
                    tweenedLength = zippedBytecode.length;
                } else {
                    for (let i = 0; i < tweened.length; ++i) {
                        const v1 = zippedBytecode[i];
                        const v2 = unzippedBytecode[i];
                        tweened[i] = Math.floor(
                            f * (v1 || 0) + (1 - f) * (v2 || 0)
                            );
                        tweenedLength = Math.floor(
                            f * zippedBytecode.length +
                                (1 - f) * unzippedBytecode.length
                        );
                    }
                }
                bytecodeHex = tweened.slice(0, tweenedLength).toString('hex');
                return f < 1;
            };
        })(1e3);
    }

    function setStatus(newStatus: string | undefined) {
        if (statusTimer) {
            clearInterval(statusTimer);
            statusTimer = undefined;
        }
        status = newStatus;
        if (newStatus !== undefined) {
            statusTimer = setTimeout(() => status = undefined, 6e3);
        }
    }

    function pasteHandler(e: ClipboardEvent) {
        const raw = e.clipboardData?.getData('text');
        try {
            if (!(raw?.match(/^(0x)?([a-f0-9]{2})+$/i))) {
                setArtifactJSON(raw);
            } else {
                abi = undefined;
                setBytecode(raw);
            }
            setStatus(undefined);
        } catch (err: any) {
            setStatus(err.message);
            throw err;
        }
    }

    async function dropHandler(e: DragEvent) {
        let item = [...(e.dataTransfer?.items || [])]
            .find(i => i.kind === 'file' && i.type === 'application/json');
        try {
            if (!item) {
                throw new Error(`Invalid build artifact file!`);
            }
            const contents = await item.getAsFile()!.text();
            setArtifactJSON(contents);
            setStatus(undefined);
        } catch (err: any) {
            setStatus(err.message);
            throw err;
        }
    }

    function keyHandler(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            setBytecode(undefined);
        }
    }

    onMount(() => {
        const resizeHandler = () => {
            rootStyles.height = `${window.innerHeight + 0.5}px`;
        };
        window.addEventListener('resize', resizeHandler);
        resizeHandler();

        setInterval(() => {
            if (animateZip) {
                if (!animateZip()) {
                    animateZip = undefined;
                }
            }
        }, 75);
    });
</script>
<style lang="scss">
    @import "@picocss/pico/scss/pico.scss";

    :global(a) {
        transition: none !important;
        color: #12b9c5 !important;
    }
    :global(a:hover, a:active, a:focus) {
        transition: none !important;
        background-color: white !important;
        // filter: invert(1);
        animation: none;
    }
    .strike {
        text-decoration: line-through;
        opacity: 0.5;
    }

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
            grid-template: 1fr auto minmax(1.5em, auto) / 1fr;
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
            
                .info-content {
                    display: flex;
                    flex-direction: column;
                    gap: 2em;
                    height: 100%;
                    justify-content: center;
                    
                    .fields > .field {  
                        overflow: hidden;
                        > .label {
                            // float: left;
                            white-space: nowrap;
                            float: left;
                        }
    
                        > .label::after {
                            content: "..................................................................................................................";
                        }
    
                        > .value {
                            white-space: nowrap;
                            float: right;
                            color: var(--console-text-color2);
                        }
    
                        > .value::before {
                            content: "..................................................................................................................";
                            color: var(--console-text-color1);
                        }
                    }
    
                    > .actions {
                        display: flex;
                        justify-content: center;
                        gap: 0 2ex;
                        flex-wrap: wrap;
                    }
                }
            }
            > .status-bar {
                position: relative;
                z-index: 1;
                grid-area: status-bar;
                padding: 0.1em;
                background-color: var(--ctrl-bg-color);
                color: var(--ctrl-fg-color);
                text-align: center;
                display: flex;
                justify-content: space-between;
            }
        }
        > .crt-effect-1 {
            --crt-glow-1: 215, 146, 194;

            pointer-events: none;
            position: absolute;
            z-index: 2;
            inset: 0;
            display: flex;
            flex-direction: column;
            justify-content: space-evenly;
            gap: 1em;
            box-shadow: inset 0 0 min(10vh, 10vw) rgba(27, 2, 10, 0.5);

            > .crt-effect-2 {
                position: absolute;
                inset: 0;
                background-image: linear-gradient(
                        -160deg,
                        rgba(#dbaa09, 0) 0%,
                        rgba(#dbaa09, 0.185) 66%,
                        rgba(#dbaa09, 0.28) 100%
                    );
                mix-blend-mode: hard-light;
            }
            > .crt-effect-3 {
                position: absolute;
                top: 2rem;
                right: 2rem;
                left: max(66vw, calc(100vw - 32rem));
                bottom: 2rem;
                border-radius: 0 5vmax 0 0;
                box-shadow: inset -1.5rem 1.5rem 0 rgba(rgb(137, 216, 135), 0.3);
                filter: blur(48px);
            }
            > .crt-line {
                width: 100%;
                height: 0.15em;
                box-shadow: 0 0 1em rgba(var(--crt-glow-1), 0.275);
            }
            > .crt-scan-line {
                animation: scan-line-animation 8s linear 0s infinite;
                position: absolute;
                width: 100%;
                height: 33vh;
                margin: -33vh 0 0 0;
                background-image: linear-gradient(
                    rgba(var(--crt-glow-1), 0) 0%,
                    rgba(var(--crt-glow-1), 0.08) 85%,
                    rgba(var(--crt-glow-1), 0.075) 99%,
                    rgba(var(--crt-glow-1), 0.3) 100%
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
                    hex={bytecodeHex}
                    --text-color1={COLORS['--console-text-color1']}
                    --text-color2={COLORS['--console-text-color2']} />
            </div>
            <div class="info-pane">
                <Panel
                title="INFO"
                    --frame-color={COLORS['--console-text-color1']}
                    --bg-color={COLORS['--console-bg-color']}>
                    <div class="info-content">
                        {#if Object.entries(infoFields).length}
                            <div class="fields">
                                {#each Object.entries(infoFields) as [label, value]}
                                    <div class="field">
                                        <div class="label">{label}</div>
                                        <div class="value">{value}</div>
                                    </div>
                                {/each}
                            </div>
                        {/if}
                        {#if zippedBytecode}
                            <div class="actions">
                                <div>[<a href="" class="blink">Deploy</a>]</div>
                                <div>[{#if abi && deployedAddress}<a href="">Verify</a>{:else}<span class="strike">Verify</span>{/if}]</div>
                            </div>
                        {/if}
                    </div>
                </Panel>
            </div>
            <div class="status-bar">
                <div class="left-links">
                    [<a href="https://github.com/merklejerk/zipped-contracts">Github</a>]
                </div>
                <div class="message">
                    {(() => {
                        if (status) {
                            return status;
                        }
                        if (unzippedBytecode) {
                            return '<ESC> to clear';
                        }
                        return 'Waiting for input...';
                    })()}
                </div>
                <div class="right-links">
                    [<a href="https://github.com/merklejerk/bytecode-zip-fe/docs/HELP.md">Help</a>]
                </div>
            </div>
        </div>
        {#if !unzippedBytecode}
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
        <div class="crt-effect-2" />
        <div class="crt-effect-3" />
        {#each new Array(15) as n}
            <div class="crt-line" />
        {/each}
        <div class="crt-scan-line" />
    </div>
</main>

<script lang="ts">
    import type { Abi, Address } from 'viem';
    import { onMount } from "svelte";
    import Panel from "../lib/panel.svelte";
    import HexEditor from "../lib/hex-editor.svelte";
    import pako from 'pako';
    import { Buffer } from 'buffer/';
    import { buildSelfExtracting } from '../lib/runtime';
    import { PUBLIC_Z_ADDRESSES_JSON } from '$env/static/public';
    import ConnectWalletContent, { wallet } from '$lib/connect-wallet-content.svelte';
    import DeployZippedContent from '$lib/deploy-zipped-content.svelte';
    import { EXPLORERS, NETWORK_NAMES } from '$lib/constants';
    import DeployWrapperContent from '$lib/deploy-wrapper-content.svelte';
    import InfoContent from '$lib/info-content.svelte';
    
    enum DeployStep {
        None,
        Deploy,
        Wrap,
        Verify,
        Verified,
    }

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
    let selfExtractingZipInitCode: Buffer | undefined;
    let status: string | undefined;
    let statusTimer: NodeJS.Timer | undefined;
    let abi: Abi | undefined;
    let deployStep = DeployStep.None;
    let zAddress: Address | undefined;
    let lastDeployedSelfExtractingZipAddress: Address | undefined;
    let lastDeployedWrapperAddress: Address | undefined;
    let animateZip: (() => boolean) | undefined;
    // Break some reactivity with an object cache.
    let CACHE = {
        selfExtractingZipAddress: undefined as Address | undefined,
        selfExtractingZipAddressExplorerUrl: undefined as string | undefined,
        wrapperAddress: undefined as Address | undefined,
        wrapperAddressExplorerUrl: undefined as string | undefined,
    };

    $: bytecodeHex = unzippedBytecode?.toString('hex') || undefined;
    $: animateZip = selfExtractingZipInitCode ? createZipAnimation() : undefined;
    $: zAddress = $wallet ? Z_ADDRESSES[$wallet.chainId] : undefined;
    $ : {
        if ($wallet) {
            if (lastDeployedSelfExtractingZipAddress) {
                if (CACHE.selfExtractingZipAddress !== lastDeployedSelfExtractingZipAddress) {
                    CACHE.selfExtractingZipAddress = lastDeployedSelfExtractingZipAddress;
                    CACHE.selfExtractingZipAddressExplorerUrl =
                        `${EXPLORERS[$wallet.chainId]}/address/${lastDeployedSelfExtractingZipAddress}`;
                    CACHE = CACHE;
                }
            }
            if (lastDeployedWrapperAddress)  {
                if (CACHE.wrapperAddress !== lastDeployedWrapperAddress) {
                    CACHE.wrapperAddress = lastDeployedWrapperAddress;
                    CACHE.wrapperAddressExplorerUrl =
                        `${EXPLORERS[$wallet.chainId]}/address/${lastDeployedWrapperAddress}`;
                    CACHE = CACHE;
                }
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
        deployStep = DeployStep.None;
        selfExtractingZipInitCode = undefined;
        if (!newBytecode) {
            unzippedBytecode = undefined;
            selfExtractingZipInitCode = undefined;
            animateZip = undefined;
            return;
        }
        unzippedBytecode = Buffer.from(newBytecode, 'hex');
        const zippedBytecode = Buffer.from(pako.deflate(unzippedBytecode, { level: 9 }));
        selfExtractingZipInitCode = buildSelfExtracting(
            unzippedBytecode,
            zippedBytecode,
            Z_ADDRESSES['1'],
        );
    }

    function createZipAnimation() {
        return ((duration: number) => {
            let startTime = Date.now();
            let tweened = Buffer.alloc(Math.min(
                3192,
                Math.max(
                    unzippedBytecode!.length,
                    selfExtractingZipInitCode!.length
                ),
            ));
            let tweenedLength = tweened.length;
            return () => {
                if (!unzippedBytecode || !selfExtractingZipInitCode) {
                    return false;
                }
                const f = (Date.now() - startTime) / duration;
                if (f >= 1) {
                    tweened = selfExtractingZipInitCode!;
                    tweenedLength = selfExtractingZipInitCode.length;
                } else {
                    for (let i = 0; i < tweened.length; ++i) {
                        const v1 = selfExtractingZipInitCode[i];
                        const v2 = unzippedBytecode[i];
                        tweened[i] = Math.floor(
                            f * (v1 || 0) + (1 - f) * (v2 || 0)
                            );
                        tweenedLength = Math.floor(
                            f * selfExtractingZipInitCode.length +
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
                setArtifactJSON(raw!);
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
            reset();
        }
    }

    function reset() {
        setBytecode(undefined);
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
    @import "$lib/common.scss";

    input[type=text] {
        background-color: white;
        border-radius: 0;
        box-shadow: inset 0.22em 0.22em 0 var(--ctrl-fg-color);
    }

    main {
        width: 100%;
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
            color: var(--ctrl-fg-color);
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
                    overflow: hidden;
                    
                    .fields > .field {  

                        > * {
                            margin-bottom: 0.25em;
                        }
                        > .label {
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

                        > * {
                            white-space: nowrap;
                        }
                        a.current {
                            @extend .blink;
                        }
                        a.unavailable {
                            text-decoration: line-through;
                        }
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
                        <div class="fields">
                            {#if unzippedBytecode}
                                <div class="field">
                                    <div class="label">Input type</div>
                                    <div class="value">{ abi ? 'artifact' : 'initcode'}</div>
                                </div>
                                {#if selfExtractingZipInitCode}
                                    <div class="field">
                                        <div class="label">Zipped size</div>
                                        <div class="value">{
                                            `${
                                                (selfExtractingZipInitCode.length / 1e3).toFixed(1)
                                            }KB`
                                        }</div>
                                    </div>
                                    <div class="field">
                                        <div class="label">Compression</div>
                                        <div class="value">{
                                            `${
                                                ((1 - selfExtractingZipInitCode.length / unzippedBytecode.length) * 100)
                                                    .toFixed(1)
                                            }%`
                                        }</div>
                                    </div>
                                {/if}
                            {/if}
                            {#if CACHE.selfExtractingZipAddress && CACHE.selfExtractingZipAddressExplorerUrl}
                                <div class="field">
                                    <div class="label">Zipped address</div>
                                    <div class="value"><!--
                                        --><a href={CACHE.selfExtractingZipAddressExplorerUrl} target="_blank">{
                                                `${CACHE.selfExtractingZipAddress.slice(0, 6)}...${CACHE.selfExtractingZipAddress.slice(-4)}`
                                        }</a><!--
                                    --></div>
                                </div>
                            {/if}
                            {#if CACHE.wrapperAddress}
                                <div class="field">
                                    <div class="label">Wrapper address</div>
                                    <div class="value"><!--
                                        --><a href={CACHE.wrapperAddressExplorerUrl} target="_blank">{
                                                `${CACHE.wrapperAddress.slice(0, 6)}...${CACHE.wrapperAddress.slice(-4)}`
                                        }</a><!--
                                    --></div>
                                </div>
                            {/if}
                        </div>
                        {#if selfExtractingZipInitCode}
                            <div class="actions">
                                {#if !CACHE.selfExtractingZipAddress}
                                    <div>[<a
                                        class:current={!CACHE.selfExtractingZipAddress}
                                        on:click|preventDefault={
                                            CACHE.selfExtractingZipAddress
                                            ? undefined
                                            : () => deployStep = DeployStep.Deploy
                                        }
                                        href={
                                            CACHE.selfExtractingZipAddress
                                            ? undefined
                                            : ""
                                        }>Deploy</a>]</div>
                                {/if}
                                {#if !CACHE.wrapperAddress}
                                    <div>[<a
                                        class:unavailable={!abi}
                                        on:click|preventDefault={() => deployStep = DeployStep.Wrap}
                                        href=""
                                        >Deploy Wrapper</a>]</div>
                                {/if}
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
                    <div class="modal-content">
                        <div>To begin you can either:</div>
                        <ul>
                            <li>Paste initcode (hex)</li>
                            <li>Paste solc build artifact (JSON)</li>
                            <li>Drop solc build artifact (JSON)</li>
                        </ul>
                    </div>
                </Panel>
            </div>
        {:else if deployStep != DeployStep.None && (!zAddress || !$wallet)}
            <div class="display modal">
                <Panel
                    title="Deploy"
                    --bg-color={COLORS["--ctrl-bg-color"]}
                    raised>
                    <ConnectWalletContent error={
                        $wallet && !zAddress ? 'Unsupported network.' : undefined
                    } />
                </Panel>
            </div>
        {:else if $wallet && selfExtractingZipInitCode}
            {#if deployStep == DeployStep.Deploy}
                <div class="display modal">
                    <Panel
                        title="Deploy"
                        --bg-color={COLORS["--ctrl-bg-color"]}
                        raised>
                        <DeployZippedContent
                            --emphasis-color={COLORS['--console-text-color2']}
                            bind:selfExtractingZipAddress={lastDeployedSelfExtractingZipAddress}
                            wallet={$wallet}
                            initCode={selfExtractingZipInitCode}
                            on:close={() => deployStep = DeployStep.None}
                        />
                    </Panel>
                </div>
            {:else if deployStep == DeployStep.Wrap}
                <div class="display modal">
                    {#if abi}
                        <Panel
                            title="Deploy Wrapper"
                            --bg-color={COLORS["--ctrl-bg-color"]}
                            raised>
                            <DeployWrapperContent
                                --emphasis-color={COLORS['--console-text-color2']}
                                selfExtractingZipAddress={CACHE.selfExtractingZipAddress}
                                unzippedContractAbi={abi}
                                bind:wrapperAddress={lastDeployedWrapperAddress}
                                wallet={$wallet}
                                on:close={() => deployStep = DeployStep.None}
                            />
                        </Panel>
                    {:else}
                        <Panel
                            title="Deploy Wrapper"
                            --bg-color={COLORS["--ctrl-bg-color"]}
                            raised>
                            <InfoContent
                                on:close={() => deployStep = DeployStep.None}
                            >
                                This action is only available if you provide a build artifact!
                            </InfoContent>
                        </Panel>
                    {/if}
                </div>
            {/if}
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

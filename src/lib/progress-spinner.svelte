<script lang="ts">
    const BAR_CHAR = '=';
    const barChars = new Array(100).fill(BAR_CHAR).join('');
    let charsElem: HTMLSpanElement;
    
</script>

<style lang="scss">
    .spinner {
        width: 100%;
        display: flex; 
        flex-direction: row;
        justify-content: space-between;

        > .bar {
            overflow: hidden;
            flex: 1 1 auto;
            position: relative;

            > .chars {
                text-align: left;
                position: absolute;
                width: 1em;
                overflow: hidden;
                word-wrap: break-word;
                animation: bar-anim 3s linear 0s infinite;
            }
        }

        @keyframes bar-anim {
            0% {
                width: 1em;
            }
            70% {
                width: calc(100% + 1em);
            }
            100% {
                width: calc(100% + 1em);
            }
        }
    }
</style>

<div class="spinner">
    <span>[</span><!--
    --><span class="bar"><span class="chars" bind:this={charsElem}>{barChars}</span></span><!--
    --><span>]</span>
</div>
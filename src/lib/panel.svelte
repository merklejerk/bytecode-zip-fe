<script lang="ts">
    export let title: string = '';
    export let raised: boolean = false;
</script>

<style lang="scss">
    :root {
        --frame-color: #444;
        --bg-color: inherit;
        --fg-color: inherit;
    }

    .panel {
        position: relative;
        background-color: var(--bg-color);
        color: var(--fg-color);
        display: flex;
        flex-direction: column;
        line-height: 1.33em;
        align-items: stretch;
        justify-content: stretch;

        > .frame {
            flex: 0 0 auto;
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: inherit;
            pointer-events: none;

            > .border {
                position: absolute;
                inset: 0;
                margin: 0.5em 4px 4px 4px;
                border: 3px solid var(--frame-color);
                > .border {
                    position: absolute;
                    inset: 0;
                    margin: 4px;
                    border: 3px solid var(--frame-color);
                }
            }
            > .title {
                position: relative;
                background-color: inherit;
                padding: 0 0.15ex;
                vertical-align: top;
                color: var(--frame-color);
            }
        }

        > .panel-content {
            flex: 1 1 100%;
            display: flex;
            flex-direction: column;
            background-color: var(--bg-color);
            padding: 1ex;
            margin: calc(0) calc((4px + 3px) * 2) calc((4px + 3px) * 2) calc((4px + 3px) * 2);
        }
    }
    .panel.raised {
        box-shadow: 1em 1em 0 rgba(black, 0.5);
    }
</style>

<div class="panel" class:raised={raised}>
    <div class="frame">
        <div class="border">
            <div class="border">
            </div>
        </div>
        <div class="title">{title}</div>
    </div>
    <div class="panel-content">
        <slot />
    </div>
</div>

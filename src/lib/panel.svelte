<script lang="ts">
    export let title: string = '';
    export let raised: boolean = false;
</script>

<style lang="scss">
    @import "$lib/common.scss";

    .panel {
        --default-frame-color: #444;
        position: relative;
        background-color: var(--bg-color, inherit);
        display: flex;
        flex-direction: column;

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
                border: 3px solid var(--frame-color, var(--default-frame-color));
                > .border {
                    position: absolute;
                    inset: 0;
                    margin: 4px;
                    border: 3px solid var(--frame-color, var(--default-frame-color));
                }
            }
            > .title {
                position: relative;
                background-color: inherit;
                padding: 0 0.15ex;
                vertical-align: top;
                color: var(--frame-color, var(--default-frame-color));
            }
        }

        > .panel-content {
            flex: 1 1 100%;
            background-color: var(--bg-color, inherit);
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

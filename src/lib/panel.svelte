<script lang="ts">
    export let title: string = '';
</script>

<style lang="scss">
    :root {
        --default-frame-color: #444;
    }
    .panel {
        display: flex;
        position: relative;
        flex-direction: column;
        justify-content: center;
        background-color: var(--bg-color, inherit);

        > .frame {
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
            background-color: var(--bg-color, inherit);
            margin: 0.25em calc(16px + 0.5ex) 16px calc(16px + 0.5ex);
        }
    }
    .panel.raised {
        box-shadow: 1em 1em 0 rgba(black, 0.5);
    }
</style>

<div class="panel raised">
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

<script lang="ts">
import "@picocss/pico";

</script>

<style lang="scss">
    @font-face {
        font-family: 'VT323';
        src: url('/VT323-Regular.ttf') format('truetype');
    }
    @font-face {
        font-family: '3270';
        src: url('/3270-Regular.ttf') format('truetype');
    }
    @font-face {
        font-family: 'IBM';
        src: url('/IBM.ttf') format('truetype');
    }
    @font-face {
        font-family: 'Atari';
        src: url('/Atari.ttf') format('truetype');
    }
    @keyframes blink-animation {
        50% {
            opacity: 0;
        }
        100% {
            opacity: 1;
        }
    }

    :global(.blink) {
        animation: blink-animation 1s steps(1, start) infinite;
    }
</style>

<slot />
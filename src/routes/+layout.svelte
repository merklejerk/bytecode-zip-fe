<script lang="ts">
</script>

<style lang="scss">
    @import "$lib/common.scss";

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

    :global(body) {
        @if map-get($breakpoints, "sm") {
          @media (min-width: map-get($breakpoints, "sm")) {
            font-size: 17px;
          }
        }
    
        @if map-get($breakpoints, "md") {
          @media (min-width: map-get($breakpoints, "md")) {
            font-size: 18px;
          }
        }
    
        @if map-get($breakpoints, "lg") {
          @media (min-width: map-get($breakpoints, "lg")) {
            font-size: 19px;
          }
        }
    
        @if map-get($breakpoints, "xl") {
          @media (min-width: map-get($breakpoints, "xl")) {
            font-size: 20px;
          }
        }
    }
    
    :global(a) {
        color: #12b9c5;
        transition: none;
        text-decoration: none;
    }
    :global(a:not([href]):hover) {
        text-decoration: none;
    }
    :global(a[href]:hover) {
        animation: none;
    }
    :global(a[href]:hover, a[href]:active, a[href]:focus) {
        text-decoration: none;
        transition: none;
        background-color: white;
        animation: none !important;
    }
    :global(body) {
        margin: 0;
        padding: 0;
    }
    :global(input) {
        font-family: inherit;
        font-size: inherit;
        margin-right: -1ex;
    }
    :global(input:focus) {
        outline: none !important;
        box-shadow: none !important;
    }
    :global(input[type="radio"]) {
        appearance: none;
        border: 0;
    }
    :global(input[type="radio"]:checked) {
        background-color: transparent;
    }
    :global(input[type="radio"]::before) {
        content: '[ ]';
        white-space: nowrap;
    }
    :global(input[type="radio"]:checked::before) {
        content: '[x]';
        white-space: nowrap;
        font-weight: bold;
    }
    :global(label) {
        display: inline-block;
    }
</style>

<slot />
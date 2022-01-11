<script>
  import sticky from '../utils/sticky.js';

  export let stickToTop = true;

  let isStuck = false;

  function handleStuck(e) {
    isStuck = e.detail.isStuck;
  }
</script>

<style>
  .sticky {
    position: sticky;
    @apply bg-white transition-all duration-300 p-4;
  }

  .sticky[data-position='top'] {
    @apply top-4
  }

  .sticky[data-position='bottom'] {
    @apply bottom-4;
  }

  .sticky.isStuck {
    @apply shadow bg-white;
  }
</style>

<section>
  {#if !stickToTop}
    <slot name="wrapper"/>
  {/if}

  <div
    class="sticky"
    class:isStuck
    data-position={stickToTop ? 'top' : 'bottom'}
    use:sticky={{ stickToTop }}
    on:stuck={handleStuck}>
    <slot name="content"/>
  </div>

  {#if stickToTop}
    <slot name="wrapper"/>
  {/if}
</section>

<script>
  import { gallery } from "../gallery.js";
  import Folder from "./Folder.svelte";
  import CardOverlay from "./CardOverlay.svelte";

  // which card is open: { folderIndex, cardIndex } or null
  let open = null;

  const openCard = (folderIndex, cardIndex) =>
    (open = { folderIndex, cardIndex });
  const close = () => (open = null);

  $: openFolder = open ? gallery[open.folderIndex] : null;
</script>

<main class="gallery">
  <header class="gallery__head">
    <h1>My Collection</h1>
    <p class="subtitle">Tap a card to see it shine.</p>
  </header>

  {#each gallery as folder, fi (folder.folder)}
    <Folder
      name={folder.folder}
      cards={folder.cards}
      on:open={(e) => openCard(fi, e.detail.index)}
    />
  {/each}
</main>

{#if open}
  <CardOverlay
    cards={openFolder.cards}
    index={open.cardIndex}
    on:close={close}
  />
{/if}

<style>
  .gallery {
    max-width: 1100px;
    margin: 0 auto;
    padding: clamp(2rem, 5vw, 4rem) clamp(1.25rem, 4vw, 2.5rem) 6rem;
  }

  .gallery__head {
    margin-bottom: 3rem;
  }

  .gallery__head h1 {
    margin: 0 0 0.4rem;
    font-size: clamp(1.9rem, 5vw, 2.75rem);
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .subtitle {
    margin: 0;
    color: hsl(220, 8%, 50%);
    font-size: 1rem;
  }
</style>

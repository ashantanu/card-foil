<script>
  import { createEventDispatcher } from "svelte";

  export let card;

  const dispatch = createEventDispatcher();
  let loaded = false;

  const open = () => dispatch("open");
  const onKey = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  };
</script>

<button
  class="thumb"
  class:loaded
  on:click={open}
  on:keydown={onKey}
  aria-label="Open {card.name}"
>
  <img
    src={card.img}
    alt={card.name}
    loading="lazy"
    width="660"
    height="921"
    on:load={() => (loaded = true)}
  />
</button>

<style>
  .thumb {
    display: block;
    width: 100%;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
    border-radius: 12px;
    overflow: hidden;
    aspect-ratio: 660 / 921;
    box-shadow: 0 1px 2px hsla(220, 10%, 20%, 0.08),
      0 6px 16px hsla(220, 10%, 20%, 0.1);
    transition: transform 0.25s cubic-bezier(0.2, 0.7, 0.2, 1),
      box-shadow 0.25s ease;
    /* subtle skeleton while the CDN image loads */
    background: linear-gradient(
      120deg,
      hsl(220, 14%, 93%),
      hsl(220, 14%, 96%)
    );
  }

  .thumb img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;
    transition: opacity 0.4s ease;
  }

  .thumb.loaded img {
    opacity: 1;
  }

  .thumb:hover,
  .thumb:focus-visible {
    transform: translateY(-6px) scale(1.02);
    box-shadow: 0 2px 4px hsla(220, 10%, 20%, 0.1),
      0 16px 32px hsla(220, 10%, 20%, 0.18);
    outline: none;
  }

  .thumb:focus-visible {
    outline: 2px solid var(--accent, hsl(200, 90%, 45%));
    outline-offset: 3px;
  }

  @media (prefers-reduced-motion: reduce) {
    .thumb,
    .thumb img {
      transition: none;
    }
    .thumb:hover,
    .thumb:focus-visible {
      transform: none;
    }
  }
</style>

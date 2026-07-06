<script>
  import { onMount, createEventDispatcher } from "svelte";
  import { fade } from "svelte/transition";
  import Card from "./Card.svelte";

  // the folder's cards + which one we opened
  export let cards = [];
  export let index = 0;

  const dispatch = createEventDispatcher();
  let closeBtn;

  $: current = cards[index];
  $: hasPrev = index > 0;
  $: hasNext = index < cards.length - 1;

  const close = () => dispatch("close");
  const prev = () => { if (hasPrev) index -= 1; };
  const next = () => { if (hasNext) index += 1; };

  const onKey = (e) => {
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") prev();
    else if (e.key === "ArrowRight") next();
  };

  // clicking the backdrop (not the card) closes
  const onScrimClick = (e) => {
    if (e.target === e.currentTarget) close();
  };

  onMount(() => closeBtn && closeBtn.focus());
</script>

<svelte:window on:keydown={onKey} />

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- backdrop click is a mouse convenience; Esc closes for keyboard users -->
<div
  class="scrim"
  role="dialog"
  aria-modal="true"
  aria-label="{current.name} — card view"
  on:click={onScrimClick}
  transition:fade={{ duration: 200 }}
>
  <button class="ctrl close" bind:this={closeBtn} on:click={close} aria-label="Close">
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    </svg>
  </button>

  {#if hasPrev}
    <button class="ctrl nav prev" on:click={prev} aria-label="Previous card">
      <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
        <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
  {/if}

  <div class="stage">
    {#key current.id}
      <Card
        overlay={true}
        id={current.id}
        name={current.name}
        set={current.set}
        number={current.number}
        rarity={current.rarity}
        img={current.img}
      />
    {/key}
    <p class="caption">{current.name}</p>
  </div>

  {#if hasNext}
    <button class="ctrl nav next" on:click={next} aria-label="Next card">
      <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
        <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
  {/if}
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: grid;
    place-items: center;
    background: hsla(230, 30%, 6%, 0.82);
    backdrop-filter: blur(10px) saturate(1.1);
    -webkit-backdrop-filter: blur(10px) saturate(1.1);
  }

  .stage {
    display: grid;
    place-items: center;
  }

  /* the .card has only aspect-ratio (no intrinsic width); size it here so it
     doesn't collapse. height follows from --card-aspect (0.718). */
  .stage :global(.card) {
    /* height = width / 0.718 ≈ width * 1.393, so cap width by ~58vh to keep
       the card ~81vh tall at most, leaving room for the controls + caption. */
    width: min(84vw, 58vh, 380px);
  }

  .caption {
    position: fixed;
    left: 0;
    right: 0;
    bottom: max(1.1rem, env(safe-area-inset-bottom));
    margin: 0;
    text-align: center;
    color: hsla(0, 0%, 100%, 0.85);
    font-size: 0.95rem;
    font-weight: 500;
    letter-spacing: 0.01em;
    text-shadow: 0 1px 8px hsla(230, 30%, 4%, 0.6);
    pointer-events: none;
  }

  .ctrl {
    position: fixed;
    z-index: 210;
    display: grid;
    place-items: center;
    border: 0;
    cursor: pointer;
    color: #fff;
    background: hsla(0, 0%, 100%, 0.1);
    border: 1px solid hsla(0, 0%, 100%, 0.18);
    border-radius: 999px;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    transition: background 0.2s ease, transform 0.15s ease;
  }
  .ctrl:hover {
    background: hsla(0, 0%, 100%, 0.2);
  }
  .ctrl:active {
    transform: scale(0.94);
  }
  .ctrl:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 2px;
  }

  .close {
    top: max(1rem, env(safe-area-inset-top));
    right: max(1rem, env(safe-area-inset-right));
    width: 44px;
    height: 44px;
  }

  .nav {
    top: 50%;
    transform: translateY(-50%);
    width: 48px;
    height: 48px;
  }
  .nav:active {
    transform: translateY(-50%) scale(0.94);
  }
  .prev {
    left: max(0.75rem, env(safe-area-inset-left));
  }
  .next {
    right: max(0.75rem, env(safe-area-inset-right));
  }

  @media (prefers-reduced-motion: reduce) {
    .ctrl {
      transition: none;
    }
  }
</style>

<script>
  import { slide } from "svelte/transition";
  import { createEventDispatcher } from "svelte";
  import Thumb from "./Thumb.svelte";

  export let name;
  export let cards = [];

  const dispatch = createEventDispatcher();
  let expanded = true;

  const toggle = () => (expanded = !expanded);
  const openCard = (index) => dispatch("open", { index });
</script>

<section class="folder">
  <button
    class="folder__header"
    on:click={toggle}
    aria-expanded={expanded}
  >
    <svg
      class="chevron"
      class:collapsed={!expanded}
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
    >
      <path
        d="M6 9l6 6 6-6"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
    <h2 class="folder__name">{name}</h2>
    <span class="folder__count">{cards.length}</span>
  </button>

  {#if expanded}
    <div class="folder__grid" transition:slide|local={{ duration: 260 }}>
      {#each cards as card, i (card.id)}
        <Thumb {card} on:open={() => openCard(i)} />
      {/each}
    </div>
  {/if}
</section>

<style>
  .folder {
    margin-bottom: 2.5rem;
  }

  .folder__header {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
    padding: 0.6rem 0;
    border: 0;
    background: none;
    cursor: pointer;
    color: inherit;
    text-align: left;
    border-bottom: 1px solid hsla(220, 12%, 20%, 0.1);
  }

  .folder__name {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .folder__count {
    font-size: 0.8rem;
    font-weight: 600;
    color: hsl(220, 8%, 55%);
    background: hsla(220, 12%, 40%, 0.08);
    border-radius: 999px;
    padding: 0.1rem 0.55rem;
    line-height: 1.5;
  }

  .chevron {
    color: hsl(220, 8%, 45%);
    transition: transform 0.25s ease;
    flex: none;
  }
  .chevron.collapsed {
    transform: rotate(-90deg);
  }

  .folder__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1.5rem;
    padding-top: 1.5rem;
  }

  @media (min-width: 640px) {
    .folder__grid {
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 1.75rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .chevron {
      transition: none;
    }
  }
</style>

<script>
  import { onMount } from "svelte";
  import { resetBaseOrientation } from "../stores/orientation.js";

  // iOS 13+ requires DeviceOrientationEvent.requestPermission() to be called
  // from a real user gesture (a tap). Android / desktop deliver the
  // `deviceorientation` event without a prompt, so the button is only needed —
  // and only shown — on iOS.
  let needsPermission = false;
  let granted = false;
  let denied = false;

  onMount(() => {
    needsPermission =
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function";
  });

  const enableMotion = async () => {
    try {
      const state = await DeviceOrientationEvent.requestPermission();
      if (state === "granted") {
        // capture a fresh baseline from the user's current hold position
        resetBaseOrientation();
        granted = true;
      } else {
        denied = true;
      }
    } catch (err) {
      denied = true;
    }
  };
</script>

{#if needsPermission && !granted}
  <button class="motion-permission" on:click={enableMotion}>
    {#if denied}
      Motion blocked — enable in Safari settings
    {:else}
      📱 Tap to enable motion
    {/if}
  </button>
{/if}

<style>
  .motion-permission {
    position: fixed;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 100;
    padding: 0.75rem 1.25rem;
    font-size: 0.95rem;
    font-weight: 600;
    color: #fff;
    background: rgba(20, 20, 30, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 999px;
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    cursor: pointer;
  }
  .motion-permission:active {
    transform: translateX(-50%) scale(0.97);
  }
</style>

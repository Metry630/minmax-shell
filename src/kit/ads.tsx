// Ads stay off until Joshua decides (START-HERE, "Before ads"). While this is false, every AdSlot
// renders nothing and no ad network script is ever loaded.
export const adsEnabled = false;

export function AdSlot({ slot }: { slot: string }) {
  // When ads go on, the network's tag mounts here, with a fixed height so the page doesn't jump.
  return adsEnabled ? <div data-ad-slot={slot} className="min-h-[100px]" /> : null;
}

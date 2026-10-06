import { useEffect, useMemo, useState } from "react";

import type { Belt, Kind, Perspective } from "../graph";
import type { Stat } from "../model";
import { ICONS, PORTRAITS } from "./index";
import { BELT_COLOURS, PALETTE } from "./palette";
import { cast, drawScene, poseBetween, SCENE } from "./rig";
import { runs, size, type Sprite } from "./sprite";

// The art as React components: each sprite becomes an SVG with one rect per run of colour, so it's
// crisp at any size (no image-rendering tricks) and themes can't blur it. Size them with CSS on
// `className` (width; the height follows the viewBox). Lovable places these; the pixels live in
// ./sprites and ./rig, drawn by Claude Code and signed off by Joshua (docs/guard/ART.md).

type Common = { className?: string; title?: string };

/** Any sprite. `belt` colours the `L` pixels; `flip` mirrors it (the opponent faces left). */
export function PixelSprite({
  sprite,
  belt = "white",
  flip = false,
  className,
  title,
}: Common & { sprite: Sprite; belt?: Belt | "black"; flip?: boolean }) {
  const { w, h } = size(sprite);
  const rects = useMemo(() => runs(sprite), [sprite]);
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      shapeRendering="crispEdges"
    >
      {title && <title>{title}</title>}
      <g transform={flip ? `translate(${w} 0) scale(-1 1)` : undefined}>
        {rects.map(({ x, y, w: rw, key }) => (
          <rect
            key={`${x},${y}`}
            x={x}
            y={y}
            width={rw}
            height={1}
            fill={key === "L" ? BELT_COLOURS[belt] : PALETTE[key]}
          />
        ))}
      </g>
    </svg>
  );
}

/**
 * A fighter's portrait: "hero" for yours, an archetype id for theirs (wrestler, judoka,
 * leg-locker, guard-player, scrambler). Pass `flip` for the right-hand side of the VS screen.
 */
export function Portrait({
  id,
  belt,
  flip,
  className,
  title,
}: Common & { id: string; belt: Belt; flip?: boolean }) {
  const sprite = PORTRAITS[id] ?? PORTRAITS["hero"];
  if (!sprite) return null;
  return (
    <PixelSprite
      sprite={sprite}
      belt={belt}
      flip={flip ?? false}
      {...(className === undefined ? {} : { className })}
      {...(title === undefined ? {} : { title })}
    />
  );
}

/** A stat's 16x16 icon. */
export function StatIcon({ stat, className, title }: Common & { stat: Stat }) {
  const sprite = ICONS[stat];
  if (!sprite) return null;
  return (
    <PixelSprite
      sprite={sprite}
      {...(className === undefined ? {} : { className })}
      {...(title === undefined ? {} : { title })}
    />
  );
}

type Place = { kind: Kind; perspective: Perspective };

/** A position, still: you in red, them in blue. 48x32. */
export function PositionScene({ kind, perspective, className, title }: Common & Place) {
  const sprite = useMemo(() => {
    const { you, them } = cast(kind, perspective);
    return drawScene(you, them);
  }, [kind, perspective]);
  return (
    <PixelSprite
      sprite={sprite}
      {...(className === undefined ? {} : { className })}
      {...(title === undefined ? {} : { title })}
    />
  );
}

/** Frames of the tween between two positions, and how long each shows. */
export const TWEEN = { frames: 4, frameMs: 90 } as const;

/**
 * A position the fighters move into: when `to` changes, they step from `from` to `to` in a few
 * stepped frames (16-bit motion, not smooth), or jump straight there under reduced motion. Your
 * fighter keeps red through a sweep, so a reversal reads as red rolling from bottom to top.
 */
export function FightScene({
  from,
  to,
  reducedMotion = false,
  className,
  title,
}: Common & { from: Place; to: Place; reducedMotion?: boolean }) {
  const [frame, setFrame] = useState(reducedMotion ? TWEEN.frames : 0);
  const key = `${from.kind}/${from.perspective}>${to.kind}/${to.perspective}`;
  useEffect(() => {
    if (reducedMotion) {
      setFrame(TWEEN.frames);
      return;
    }
    setFrame(0);
    const timer = setInterval(() => {
      setFrame((f) => {
        if (f + 1 >= TWEEN.frames) clearInterval(timer);
        return Math.min(TWEEN.frames, f + 1);
      });
    }, TWEEN.frameMs);
    return () => clearInterval(timer);
  }, [key, reducedMotion]);

  const sprite = useMemo(() => {
    const a = cast(from.kind, from.perspective);
    const b = cast(to.kind, to.perspective);
    const t = frame / TWEEN.frames;
    return drawScene(poseBetween(a.you, b.you, t), poseBetween(a.them, b.them, t));
  }, [from.kind, from.perspective, to.kind, to.perspective, frame]);

  return (
    <PixelSprite
      sprite={sprite}
      {...(className === undefined ? {} : { className })}
      {...(title === undefined ? {} : { title })}
    />
  );
}

export { SCENE };

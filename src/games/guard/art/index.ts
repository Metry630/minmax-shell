import type { Stat } from "../model";
import type { Sprite } from "./sprite";
import { guardPlayer } from "./sprites/guard-player";
import { hero } from "./sprites/hero";
import { iconBack } from "./sprites/icon-back";
import { iconChokes } from "./sprites/icon-chokes";
import { iconEscapes } from "./sprites/icon-escapes";
import { iconGuard } from "./sprites/icon-guard";
import { iconJointLocks } from "./sprites/icon-joint-locks";
import { iconPassing } from "./sprites/icon-passing";
import { iconStanding } from "./sprites/icon-standing";
import { iconTop } from "./sprites/icon-top";
import { judoka } from "./sprites/judoka";
import { legLocker } from "./sprites/leg-locker";
import { scrambler } from "./sprites/scrambler";
import { wrestler } from "./sprites/wrestler";

// Every sprite, by the id the game uses: portraits by archetype id (opponents.ts) plus "hero" for
// your fighter, stat icons by stat. art.test.ts checks every archetype and stat has one.

export const PORTRAITS: Partial<Record<string, Sprite>> = {
  hero,
  wrestler,
  judoka,
  "leg-locker": legLocker,
  "guard-player": guardPlayer,
  scrambler,
};

export const ICONS: Record<Stat, Sprite> = {
  standing: iconStanding,
  guard: iconGuard,
  passing: iconPassing,
  top: iconTop,
  back: iconBack,
  escapes: iconEscapes,
  chokes: iconChokes,
  "joint-locks": iconJointLocks,
};

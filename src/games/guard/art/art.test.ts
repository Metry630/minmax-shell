// @vitest-environment node
import { describe, expect, it } from "vitest";

import { POSITIONS, type Kind } from "../graph";
import { STATS } from "../model";
import { ARCHETYPES } from "../opponents";
import { ICONS, PORTRAITS } from "./index";
import { LOOKS, SCENE, SCENES, cast, drawScene, poseBetween, sceneSprite } from "./rig";
import { problems, runs, size } from "./sprite";

describe("the sprites", () => {
  it("has a portrait for your fighter and every archetype, all 32x40 and valid", () => {
    for (const id of ["hero", ...ARCHETYPES.map((a) => a.id)]) {
      const sprite = PORTRAITS[id];
      expect(sprite, id).toBeDefined();
      if (!sprite) continue;
      expect(problems(sprite), id).toEqual([]);
      expect(size(sprite), id).toEqual({ w: 32, h: 40 });
      // Today's belt shows on every portrait.
      expect(sprite.rows.join(""), id).toContain("L");
    }
  });

  it("has a 16x16 icon for every stat", () => {
    for (const stat of STATS) {
      expect(problems(ICONS[stat]), stat).toEqual([]);
      expect(size(ICONS[stat]), stat).toEqual({ w: 16, h: 16 });
    }
  });

  it("draws runs that cover exactly the non-transparent pixels", () => {
    const sprite = ICONS.back;
    const covered = runs(sprite).reduce((a, r) => a + r.w, 0);
    const solid = sprite.rows.join("").replace(/\./g, "").length;
    expect(covered).toBe(solid);
  });
});

describe("the position rig", () => {
  it("draws every position kind the graph uses, with both fighters visible", () => {
    const kinds = new Set(Object.values(POSITIONS).map((p) => p.kind));
    for (const kind of kinds) {
      expect(SCENES[kind], kind).toBeDefined();
      for (const perspective of ["top", "bottom"] as const) {
        const sprite = sceneSprite(kind, perspective);
        expect(problems(sprite)).toEqual([]);
        expect(size(sprite)).toEqual({ w: SCENE.w, h: SCENE.h });
        const pixels = sprite.rows.join("");
        expect(pixels, `${kind} ${perspective}: you`).toContain(LOOKS.you.body);
        expect(pixels, `${kind} ${perspective}: them`).toContain(LOOKS.them.body);
      }
    }
  });

  it("puts you in the bottom pose when you're underneath", () => {
    const kind: Kind = "mount";
    expect(cast(kind, "bottom").you).toBe(SCENES.mount.bottom);
    expect(cast(kind, "top").you).toBe(SCENES.mount.top);
  });

  it("tweens from one pose to the other", () => {
    const { top, bottom } = SCENES.guard;
    expect(poseBetween(top, bottom, 0)).toEqual(top);
    expect(poseBetween(top, bottom, 1)).toEqual(bottom);
    const mid = poseBetween(top, bottom, 0.5);
    expect(mid.head[0]).toBeCloseTo((top.head[0] + bottom.head[0]) / 2);
    // A half-way frame still draws cleanly.
    expect(problems(drawScene(mid, top))).toEqual([]);
  });
});

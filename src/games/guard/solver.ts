import { applyCamp, finishChance, toScore, type Board, type Fight } from "./engine";
import { MAX_SKILL, STATS } from "./model";

// The best camp, exactly. Trying every camp is C(S + 14, 14) evaluations (38,760 at 6 sessions) at
// about 1 ms each, so the solver prunes: more skill never lowers the chance (engine.test.ts checks
// it on thousands of fights), so "these sessions so far, plus every remaining session in every stat
// still open" bounds every camp below a branch. A branch whose bound scores below the best camp found
// can't contain a better one. Ties are kept, so `camps` lists every optimal camp (up to TIE_LIMIT).

export type Base = Omit<Fight, "skills"> & { skills: readonly number[] };

export type Solved = {
  /** Best score (per-mille) and the camps that reach it. */
  score: number;
  camps: number[][];
  /** How many camps tie for best; `camps` stops at TIE_LIMIT. */
  ties: number;
  /** The score with no camp at all: where the fighter starts. */
  baseline: number;
  /** Exact evaluations the search needed, for QUALITY.md. */
  evaluated: number;
};

const TIE_LIMIT = 50;

const scoreOf = (board: Board, base: Base, skills: readonly number[]) =>
  toScore(finishChance(board, { ...base, skills }));

/** Each session where it adds the most right now; the quality report's greedy player. */
export function greedyCamp(board: Board, base: Base, sessions: number): number[] {
  const camp: number[] = STATS.map(() => 0);
  const skills = [...base.skills];
  for (let s = 0; s < sessions; s++) {
    let bestStat = -1;
    let bestP = -1;
    for (let i = 0; i < skills.length; i++) {
      if ((skills[i] ?? 0) >= MAX_SKILL) continue;
      const tried = skills.slice();
      tried[i] = (tried[i] ?? 0) + 1;
      const p = finishChance(board, { ...base, skills: tried });
      if (p > bestP) {
        bestP = p;
        bestStat = i;
      }
    }
    if (bestStat === -1) break;
    skills[bestStat] = (skills[bestStat] ?? 0) + 1;
    camp[bestStat] = (camp[bestStat] ?? 0) + 1;
  }
  return camp;
}

export function solveCamp(board: Board, base: Base, sessions: number): Solved {
  let evaluated = 0;
  const evaluate = (skills: readonly number[]) => {
    evaluated++;
    return scoreOf(board, base, skills);
  };

  const greedy = greedyCamp(board, base, sessions);
  const greedySkills = applyCamp(base.skills, greedy, sessions);
  let best = greedySkills ? evaluate(greedySkills) : -1;
  let camps: number[][] = [];
  let ties = 0;

  const skills = [...base.skills];
  const camp: number[] = STATS.map(() => 0);

  const visit = (i: number, left: number) => {
    if (left === 0) {
      const score = evaluate(skills);
      if (score > best) {
        best = score;
        camps = [];
        ties = 0;
      }
      if (score === best) {
        ties++;
        if (camps.length < TIE_LIMIT) camps.push(camp.slice());
      }
      return;
    }
    if (i === skills.length) return;
    // Bound: every remaining session in every open stat at once (capped).
    const bound = skills.map((skill, j) => (j >= i ? Math.min(MAX_SKILL, skill + left) : skill));
    if (evaluate(bound) < best) return;
    const room = MAX_SKILL - (skills[i] ?? 0);
    for (let a = Math.min(left, room); a >= 0; a--) {
      skills[i] = (base.skills[i] ?? 0) + a;
      camp[i] = a;
      visit(i + 1, left - a);
    }
    skills[i] = base.skills[i] ?? 0;
    camp[i] = 0;
  };
  visit(0, sessions);

  return { score: best, camps, ties, baseline: evaluate(base.skills), evaluated };
}

/** Every camp, for tests: C(S + 14, 14) of them. */
export function* allCamps(sessions: number, stats = STATS.length): Generator<number[]> {
  const camp = new Array<number>(stats).fill(0);
  function* place(i: number, left: number): Generator<number[]> {
    if (i === stats - 1) {
      camp[i] = left;
      yield camp.slice();
      return;
    }
    for (let a = left; a >= 0; a--) {
      camp[i] = a;
      yield* place(i + 1, left - a);
    }
  }
  yield* place(0, sessions);
}

// @vitest-environment node
import { describe, expect, it } from "vitest";

import { dayNumberAt, epochDay, localPuzzleNo, puzzleWindow, utcPuzzleNo } from "./day";

const EPOCH = "2026-10-05";
const OCT_4 = epochDay("2026-10-04");
const OCT_5 = epochDay("2026-10-05");
// 02:00 UTC on Oct 5: still Oct 4 across the Americas, already Oct 5 in Asia.
const INSTANT = Date.UTC(2026, 9, 5, 2, 0);

describe("dayNumberAt", () => {
  it.each([
    ["New York (EDT, UTC-4)", -240, OCT_4],
    ["Los Angeles (PDT, UTC-7)", -420, OCT_4],
    ["Baker Island (UTC-12)", -720, OCT_4],
    ["UTC", 0, OCT_5],
    ["Jakarta (WIB, UTC+7)", 420, OCT_5],
    ["Kiritimati (UTC+14)", 840, OCT_5],
  ])("puts 02:00 UTC on Oct 5 on the local date in %s", (_zone, offset, expected) => {
    expect(dayNumberAt(INSTANT, offset)).toBe(expected);
  });

  it("rolls over at local midnight, not UTC midnight", () => {
    // 23:59 and 00:01 in New York (UTC-4) on the night of Oct 4 are 03:59Z and 04:01Z on Oct 5.
    expect(dayNumberAt(Date.UTC(2026, 9, 5, 3, 59), -240)).toBe(OCT_4);
    expect(dayNumberAt(Date.UTC(2026, 9, 5, 4, 1), -240)).toBe(OCT_5);
  });

  it("follows the offset across the US DST change on 2026-11-01", () => {
    const NOV_1 = epochDay("2026-11-01");
    // 00:30 EDT on Nov 1 is 04:30Z; clocks fall back at 06:00Z, so 23:30 EST on Nov 1 is 04:30Z Nov 2.
    expect(dayNumberAt(Date.UTC(2026, 10, 1, 4, 30), -240)).toBe(NOV_1);
    expect(dayNumberAt(Date.UTC(2026, 10, 2, 4, 30), -300)).toBe(NOV_1);
    expect(dayNumberAt(Date.UTC(2026, 10, 2, 5, 30), -300)).toBe(NOV_1 + 1);
  });
});

describe("puzzle numbers", () => {
  it("numbers the epoch's date #1", () => {
    expect(utcPuzzleNo(EPOCH, new Date(Date.UTC(2026, 9, 5, 0, 0)))).toBe(1);
    expect(utcPuzzleNo(EPOCH, new Date(Date.UTC(2026, 9, 5, 23, 59)))).toBe(1);
    expect(utcPuzzleNo(EPOCH, new Date(Date.UTC(2026, 9, 6, 0, 0)))).toBe(2);
  });

  it("reads the browser's zone with getTimezoneOffset's sign flipped", () => {
    const date = new Date(INSTANT);
    date.getTimezoneOffset = () => 240; // New York in summer: 4 hours *behind* UTC
    expect(localPuzzleNo(EPOCH, date)).toBe(0);
    date.getTimezoneOffset = () => -420; // Jakarta: 7 hours ahead
    expect(localPuzzleNo(EPOCH, date)).toBe(1);
  });

  it("rejects a malformed epoch", () => {
    expect(() => epochDay("5 Oct 2026")).toThrow();
  });
});

describe("puzzleWindow", () => {
  const now = new Date(Date.UTC(2026, 9, 10, 12, 0)); // UTC puzzle #6

  it.each([
    [0, "not_open"],
    [4, "closed"],
    [5, "open"],
    [6, "open"],
    [7, "open"],
    [8, "not_open"],
  ] as const)("treats puzzle %i as %s", (n, expected) => {
    expect(puzzleWindow(EPOCH, n, now)).toBe(expected);
  });

  it("opens every player's local puzzle, in every time zone, all day", () => {
    // Offsets from UTC-12 to UTC+14 in 15-minute steps (105 zones), instants every 15 minutes over
    // two days (192): 20,160 cases, none of which may be refused.
    const refused: string[] = [];
    let checked = 0;
    for (let step = 0; step < 192; step++) {
      const at = new Date(Date.UTC(2026, 9, 10) + step * 15 * 60_000);
      for (let offset = -720; offset <= 840; offset += 15) {
        const n = dayNumberAt(at.getTime(), offset) - epochDay(EPOCH) + 1;
        if (puzzleWindow(EPOCH, n, at) !== "open") refused.push(`${at.toISOString()} ${offset}`);
        checked++;
      }
    }
    expect(checked).toBe(20_160);
    expect(refused).toEqual([]);
  });
});

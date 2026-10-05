// @vitest-environment node
import { describe, expect, it } from "vitest";

import { strings, t } from "./i18n";

describe("t", () => {
  it("returns English by default", () => {
    expect(t("daily.submit")).toBe("Submit");
  });

  it("returns Indonesian when requested", () => {
    expect(t("daily.submit", "id")).toBe("Kirim");
  });

  it("fills placeholders", () => {
    expect(t("daily.score", "en", { score: 14, optimum: 17 })).toBe("Your score: 14. Optimum: 17.");
  });

  it("fills every occurrence and accepts strings", () => {
    expect(t("stats.line", "en", { played: 3, optimal: 1, current: 2, max: "2" })).toBe(
      "Played 3 · Optimal 1 · Streak 2 · Best 2",
    );
  });

  it("leaves a placeholder with no value as is, so the gap shows", () => {
    expect(t("daily.score", "en", { score: 14 })).toBe("Your score: 14. Optimum: {optimum}.");
  });
});

describe("strings", () => {
  it("Indonesian has exactly the English keys", () => {
    expect(Object.keys(strings.id).sort()).toEqual(Object.keys(strings.en).sort());
  });

  it("every translation keeps the English placeholders", () => {
    (Object.keys(strings.en) as Array<keyof typeof strings.en>).forEach((key) => {
      const enPlaceholders = (strings.en[key].match(/\{\w+\}/g) ?? []).sort();
      const idPlaceholders = (strings.id[key].match(/\{\w+\}/g) ?? []).sort();
      expect(idPlaceholders).toEqual(enPlaceholders);
    });
  });
});

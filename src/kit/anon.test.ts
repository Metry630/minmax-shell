// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { newUuid } from "./anon";

describe("newUuid", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("builds a v4 UUID the API accepts when crypto.randomUUID is missing (HTTP, older phones)", () => {
    const { getRandomValues } = crypto;
    vi.stubGlobal("crypto", { getRandomValues: getRandomValues.bind(crypto) });
    const ids = Array.from({ length: 50 }, newUuid);
    for (const id of ids) {
      expect(z.string().uuid().safeParse(id).success).toBe(true);
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    }
    expect(new Set(ids).size).toBe(50);
  });

  it("uses crypto.randomUUID when it exists", () => {
    vi.stubGlobal("crypto", { randomUUID: () => "11111111-2222-4333-8444-555555555555" });
    expect(newUuid()).toBe("11111111-2222-4333-8444-555555555555");
  });
});

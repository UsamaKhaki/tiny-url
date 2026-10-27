import { readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { nanoid, RESERVED_SLUGS, SLUG_PATTERN } from "./slug";

describe("generated short codes", () => {
  const codes = Array.from({ length: 500 }, () => nanoid());

  it("are seven characters that also pass the custom alias pattern", () => {
    for (const code of codes) {
      expect(code).toHaveLength(7);
      expect(code).toMatch(SLUG_PATTERN);
    }
  });

  it("never use characters that are easy to misread", () => {
    expect(codes.join("")).not.toMatch(/[0O1lI]/);
  });
});

describe("RESERVED_SLUGS", () => {
  it("covers every top-level route the app defines", () => {
    // A new page folder that is not reserved could be shadowed by a user's alias.
    const appDir = path.resolve(__dirname, "../app");
    const routes = readdirSync(appDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name) => !name.startsWith("[") && !name.startsWith("("));

    expect(routes.length).toBeGreaterThan(0);
    for (const route of routes) {
      expect(RESERVED_SLUGS.has(route), `"${route}" should be reserved`).toBe(true);
    }
  });

  it("stores entries in lower case so lookups can lower-case the alias", () => {
    for (const slug of RESERVED_SLUGS) {
      expect(slug).toBe(slug.toLowerCase());
    }
  });
});

import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";
import type { TestProject } from "vitest/node";

/** Rebuilds the integration database from the migrations so every run starts clean. */
export default function setup(project: TestProject) {
  const databaseUrl = project.config.env.DATABASE_URL;
  if (!databaseUrl?.startsWith("file:")) {
    throw new Error("Integration tests need a SQLite DATABASE_URL in vitest.config.mts.");
  }
  const file = path.resolve("prisma", databaseUrl.replace(/^file:/, ""));

  rmSync(file, { force: true });
  rmSync(`${file}-journal`, { force: true });

  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "pipe",
  });
}

import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
          exclude: [...configDefaults.exclude, "src/**/*.integration.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["src/**/*.integration.test.ts"],
          globalSetup: ["src/test/global-setup.ts"],
          setupFiles: ["src/test/setup.ts"],
          // Relative to prisma/schema.prisma, so this is prisma/test.db (gitignored).
          // The app URL is a public host so the "no links to ourselves" rule is reachable.
          env: {
            DATABASE_URL: "file:./test.db",
            NEXT_PUBLIC_APP_URL: "https://trace.example",
          },
          // Every file shares the one SQLite database, so run them one at a time.
          poolOptions: { forks: { singleFork: true } },
        },
      },
    ],
  },
});

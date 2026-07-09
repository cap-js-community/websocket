"use strict";

const path = require("node:path");
const { defineConfig } = require("vitest/config");

module.exports = defineConfig({
  test: {
    globals: true,
    include: ["**/test/**/*.test.js"],
    reporters: ["verbose"],
    setupFiles: [path.resolve(__dirname, "test/setup.js")],
    poolOptions: {
      threads: {
        minThreads: 1,
        maxThreads: 2,
      },
    },
    coverage: {
      enabled: true,
      provider: "v8",
      include: ["src/**/*.js"],
      reportsDirectory: "reports/coverage/unit/",
      reporter: ["lcov", "text"],
      thresholds: {
        branches: 75,
        functions: 90,
        lines: 90,
        statements: 90,
      },
    },
  },
});

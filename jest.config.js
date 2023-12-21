"use strict";

module.exports = {
  reporters: ["default"],
  automock: false,
  bail: false,
  clearMocks: true,
  collectCoverage: true,
  collectCoverageFrom: ["**/src/*.js"],
  coverageDirectory: "reports/coverage/unit/",
  coverageReporters: ["lcov", "text"],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 100,
      lines: 90,
      statements: 90,
    },
  },
  moduleDirectories: ["node_modules"],
  modulePathIgnorePatterns: [],
  resetMocks: false,
  resetModules: false,
  testMatch: ["**/test/**/*.test.js"],
  testPathIgnorePatterns: ["/node_modules/"],
  verbose: true,
  maxWorkers: 2,
  setupFilesAfterEnv: [],
};

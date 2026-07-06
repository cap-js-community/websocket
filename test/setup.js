"use strict";

const Module = require("node:module");
const path = require("node:path");

const REDIRECTS = {
  redis: path.resolve(__dirname, "_env/mocks/redis.js"),
  "@socket.io/redis-streams-adapter": path.resolve(__dirname, "_env/mocks/redisStreamAdapter.js"),
};

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (Object.prototype.hasOwnProperty.call(REDIRECTS, request)) {
    return REDIRECTS[request];
  }
  return originalResolve.call(this, request, ...rest);
};

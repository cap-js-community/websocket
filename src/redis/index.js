"use strict";

const cds = require("@sap/cds");
const { RedisClient } = require("@cap-js-community/common");

const LOG = cds.log("/websocket/redis");
const IS_ON_CF = process.env.USER === "vcap";

const redisClient = RedisClient.default("websocket");

async function connectionCheck(options) {
  const adapterActive = options?.active !== false;
  if (!adapterActive) {
    LOG?.info("Redis adapter is disabled");
    return false;
  }
  const adapterActiveExplicit = !!options?.active;
  const adapterLocal = !!options?.local;
  if (!(IS_ON_CF || adapterActiveExplicit || adapterLocal)) {
    LOG?.info("Redis is not activated for local environment");
    return false;
  }
  return await redisClient.connectionCheck(options?.config);
}

async function createPrimaryClientAndConnect(options) {
  return await redisClient.createMainClientAndConnect(options?.config);
}

async function createSecondaryClientAndConnect(options) {
  return await redisClient.createAdditionalClientAndConnect(options?.config);
}

async function closeClients() {
  return await redisClient.closeClients();
}

module.exports = {
  connectionCheck,
  createPrimaryClientAndConnect,
  createSecondaryClientAndConnect,
  closeClients,
};

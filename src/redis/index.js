"use strict";

const path = require("path");
const redis = require("redis");
const xsenv = require("@sap/xsenv");
const cds = require("@sap/cds");

const LOG = cds.log("websocket/redis");

xsenv.loadEnv(path.join(process.cwd(), "default-env.json"));

const IS_ON_CF = process.env.USER === "vcap";
const TIMEOUT = 5 * 1000;

let primaryClientPromise;
let secondaryClientPromise;

const createPrimaryClientAndConnect = () => {
  if (primaryClientPromise) {
    return primaryClientPromise;
  }

  const errorHandlerCreateClient = (err) => {
    LOG?.error("Error from redis client for pub/sub failed", err);
    primaryClientPromise = null;
    setTimeout(createPrimaryClientAndConnect, TIMEOUT).unref();
  };
  primaryClientPromise = _createClientAndConnect(errorHandlerCreateClient);
  return primaryClientPromise;
};

const createSecondaryClientAndConnect = () => {
  if (secondaryClientPromise) {
    return secondaryClientPromise;
  }

  const errorHandlerCreateClient = (err) => {
    LOG?.error("Error from redis client for pub/sub failed", err);
    secondaryClientPromise = null;
    setTimeout(createSecondaryClientAndConnect, TIMEOUT).unref();
  };
  secondaryClientPromise = _createClientAndConnect(errorHandlerCreateClient);
  return secondaryClientPromise;
};
const _createClientBase = () => {
  const adapterActive = cds.env.websocket?.adapter?.active !== false;
  if (!adapterActive) {
    LOG?.info("Redis adapter is disabled");
    return;
  }
  const adapterActiveExplicit = !!cds.env.websocket?.adapter?.active;
  const adapterLocal = !!cds.env.websocket?.adapter?.local;
  if (!(IS_ON_CF || adapterActiveExplicit || adapterLocal)) {
    LOG?.info("Redis not available in local environment");
    return;
  }
  let credentials;
  try {
    credentials = xsenv.serviceCredentials({ label: "redis-cache" });
  } catch (err) {
    LOG?.info(err.message);
  }
  if (!credentials) {
    LOG?.info("No Redis credentials found");
    return;
  }
  try {
    // NOTE: settings the user explicitly to empty resolves auth problems, see
    // https://github.com/go-redis/redis/issues/1343
    const redisIsCluster = credentials.cluster_mode;
    const url = credentials.uri.replace(/(?<=rediss:\/\/)[\w-]+?(?=:)/, "");
    if (redisIsCluster) {
      return redis.createCluster({
        rootNodes: [{ url }],
        // https://github.com/redis/node-redis/issues/1782
        defaults: {
          password: credentials.password,
          socket: { tls: credentials.tls },
        },
      });
    }
    return redis.createClient({ url });
  } catch (err) {
    throw new Error("error during create client with redis-cache service:" + err);
  }
};

const _createClientAndConnect = async (errorHandlerCreateClient) => {
  let client;
  try {
    client = _createClientBase();
  } catch (err) {
    errorHandlerCreateClient(new Error("Error during create client with redis-cache service:" + err));
    return;
  }
  if (!client) {
    return;
  }
  client.on("error", errorHandlerCreateClient);
  try {
    await client.connect();
    LOG?.info("Service redis-cache connected");
  } catch (err) {
    errorHandlerCreateClient(err);
    return;
  }
  return client;
};

const clearClients = () => {
  primaryClientPromise = null;
  secondaryClientPromise = null;
};

module.exports = {
  createPrimaryClientAndConnect,
  createSecondaryClientAndConnect,
  clearClients,
};

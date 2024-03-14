"use strict";

const path = require("path");
const redis = require("redis");
const xsenv = require("@sap/xsenv");
const cds = require("@sap/cds");

const LOG = cds.log("websocket/redis");

xsenv.loadEnv(path.join(process.cwd(), "default-env.json"));

const IS_ON_CF = process.env.USER === "vcap";
const LOG_AFTER_SEC = 5;

let primaryClientPromise;
let secondaryClientPromise;
let lastErrorLog = Date.now();

const createPrimaryClientAndConnect = () => {
  if (primaryClientPromise) {
    return primaryClientPromise;
  }
  const errorHandlerCreateClient = (err) => {
    LOG?.error("Error from redis client for pub/sub failed", err);
    primaryClientPromise = null;
    setTimeout(createPrimaryClientAndConnect, LOG_AFTER_SEC * 1000).unref();
  };
  primaryClientPromise = createClientAndConnect(errorHandlerCreateClient);
  return primaryClientPromise;
};

const createSecondaryClientAndConnect = () => {
  if (secondaryClientPromise) {
    return secondaryClientPromise;
  }
  const errorHandlerCreateClient = (err) => {
    LOG?.error("Error from redis client for pub/sub failed", err);
    secondaryClientPromise = null;
    setTimeout(createSecondaryClientAndConnect, LOG_AFTER_SEC * 1000).unref();
  };
  secondaryClientPromise = createClientAndConnect(errorHandlerCreateClient);
  return secondaryClientPromise;
};

const createClientBase = () => {
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

const createClientAndConnect = async (errorHandlerCreateClient) => {
  try {
    const client = createClientBase();
    await client.connect();
    client.on("error", (err) => {
      const dateNow = Date.now();
      if (dateNow - lastErrorLog > LOG_AFTER_SEC * 1000) {
        LOG?.error("Error from redis client for pub/sub failed", err);
        lastErrorLog = dateNow;
      }
    });

    client.on("reconnecting", () => {
      const dateNow = Date.now();
      if (dateNow - lastErrorLog > LOG_AFTER_SEC * 1000) {
        LOG?.info("Redis client trying reconnect...");
        lastErrorLog = dateNow;
      }
    });
    return client;
  } catch (err) {
    errorHandlerCreateClient(err);
  }
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

"use strict";

const path = require("path");
const redis = require("redis");
const xsenv = require("@sap/xsenv");
const cds = require("@sap/cds");

const LOG = cds.log("/websocket/redis");

xsenv.loadEnv(path.join(process.cwd(), "default-env.json"));

const IS_ON_CF = process.env.USER === "vcap";
const LOG_AFTER_SEC = 5;

let primaryClientPromise;
let secondaryClientPromise;
let lastErrorLog = Date.now();

const createPrimaryClientAndConnect = (options) => {
  if (primaryClientPromise) {
    return primaryClientPromise;
  }
  const errorHandlerCreateClient = (err) => {
    LOG?.error("Error from redis client for pub/sub failed", err);
    primaryClientPromise = null;
    setTimeout(() => createPrimaryClientAndConnect(options), LOG_AFTER_SEC * 1000).unref();
  };
  primaryClientPromise = createClientAndConnect(options, errorHandlerCreateClient);
  return primaryClientPromise;
};

const createSecondaryClientAndConnect = (options) => {
  if (secondaryClientPromise) {
    return secondaryClientPromise;
  }
  const errorHandlerCreateClient = (err) => {
    LOG?.error("Error from redis client for pub/sub failed", err);
    secondaryClientPromise = null;
    setTimeout(() => createSecondaryClientAndConnect(options), LOG_AFTER_SEC * 1000).unref();
  };
  secondaryClientPromise = createClientAndConnect(options, errorHandlerCreateClient);
  return secondaryClientPromise;
};

const createClientBase = (options = {}) => {
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
    credentials = xsenv.serviceCredentials({ label: "redis-cache", ...cds.env.websocket?.adapter?.vcap });
  } catch (err) {
    LOG?.info(err.message);
  }
  if (!credentials) {
    LOG?.info("No Redis credentials found");
    return;
  }
  try {
    const redisIsCluster = credentials.cluster_mode;
    const url = credentials.uri.replace(/(?<=rediss:\/\/)[\w-]+?(?=:)/, "");
    if (redisIsCluster) {
      return redis.createCluster({
        rootNodes: [{ url }],
        // https://github.com/redis/node-redis/issues/1782
        defaults: {
          password: credentials.password,
          socket: { tls: credentials.tls },
          ...options,
        },
      });
    }
    return redis.createClient({ url, ...options });
  } catch (err) {
    throw new Error("Error during create client with redis-cache service:" + err);
  }
};

const createClientAndConnect = async (options, errorHandlerCreateClient) => {
  try {
    const client = createClientBase(options);
    if (!client) {
      return;
    }
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

const closePrimaryClient = async () => {
  try {
    await resilientClientClose(await primaryClientPromise);
    primaryClientPromise = null;
  } catch (err) {
    // ignore errors during shutdown
  }
};

const closeSecondaryClient = async () => {
  try {
    await resilientClientClose(await secondaryClientPromise);
    secondaryClientPromise = null;
  } catch (err) {
    // ignore errors during shutdown
  }
};

const resilientClientClose = async (client) => {
  try {
    if (client?.quit) {
      await client.quit();
    }
  } catch (err) {
    // ignore errors during shutdown
  }
};

const connectionCheck = async (options) => {
  return new Promise((resolve, reject) => {
    createClientAndConnect(options, reject)
      .then((client) => {
        if (client) {
          resilientClientClose(client);
          resolve();
        } else {
          reject(new Error());
        }
      })
      .catch(reject);
  })
    .then(() => true)
    .catch(() => false);
};

const closeClients = async () => {
  await closePrimaryClient();
  await closeSecondaryClient();
};

module.exports = {
  connectionCheck,
  createPrimaryClientAndConnect,
  createSecondaryClientAndConnect,
  closeClients,
};

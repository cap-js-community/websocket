"use strict";

const path = require("path");
const redis = require("redis");
const xsenv = require("@sap/xsenv");
const cds = require("@sap/cds");

const LOG = cds.log("websocket/redis");

xsenv.loadEnv(path.join(process.cwd(), "default-env.json"));

const TIMEOUT = 5 * 1000;

let mainClientPromise;
let secondClientPromise;

const createMainClientAndConnect = () => {
  if (mainClientPromise) {
    return mainClientPromise;
  }

  const errorHandlerCreateClient = (err) => {
    LOG?.error("Error from redis client for pub/sub failed", err);
    mainClientPromise = null;
    setTimeout(createMainClientAndConnect, TIMEOUT);
  };
  mainClientPromise = _createClientAndConnect(errorHandlerCreateClient);
  return mainClientPromise;
};

const createSecondClientAndConnect = () => {
  if (secondClientPromise) {
    return secondClientPromise;
  }

  const errorHandlerCreateClient = (err) => {
    LOG?.error("Error from redis client for pub/sub failed", err);
    secondClientPromise = null;
    setTimeout(createSecondClientAndConnect, TIMEOUT);
  };
  secondClientPromise = _createClientAndConnect(errorHandlerCreateClient);
  return secondClientPromise;
};
const _createClientBase = () => {
  let credentials;
  try {
    credentials = xsenv.serviceCredentials({ label: "redis-cache" });
  } catch (err) {
    LOG?.info(err.message);
  }
  if (!credentials) {
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

module.exports = {
  createMainClientAndConnect,
  createSecondClientAndConnect,
};

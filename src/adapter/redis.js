"use strict";

const path = require("path");
const redis = require("redis");
const xsenv = require("@sap/xsenv");
const cds = require("@sap/cds");

const LOG = cds.log("websocket/redis");

xsenv.loadEnv(path.join(process.cwd(), "default-env.json"));

let subscriberClientPromise;

const createMainClientAndConnect = () => {
  if (subscriberClientPromise) {
    return subscriberClientPromise;
  }

  const errorHandlerCreateClient = (err) => {
    LOG?.error("error from redis client for pub/sub failed", err);
    subscriberClientPromise = null;
    setTimeout(createMainClientAndConnect, 5 * 1000);
  };
  subscriberClientPromise = _createClientAndConnect(errorHandlerCreateClient);
  return subscriberClientPromise;
};

const createClientAndConnect = () => {
  const errorHandlerCreateClient = (err) => {
    LOG?.error("error from redis client for pub/sub failed", err);
    setTimeout(createClientAndConnect, 5 * 1000);
  };
  return _createClientAndConnect(errorHandlerCreateClient);
};

const _createClientBase = () => {
  let credentials;
  try {
    credentials = xsenv.serviceCredentials({ label: "redis-cache" });
  } catch (err) {
    LOG?.info(err.message);
  }
  if (credentials) {
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
  }
};

const _createClientAndConnect = async (errorHandlerCreateClient) => {
  let client = null;
  try {
    client = _createClientBase();
  } catch (err) {
    throw new Error("error during create client with redis-cache service:" + err);
  }
  if (!client) {
    return;
  }
  client.on("error", errorHandlerCreateClient);
  try {
    await client.connect();
    LOG?.info("redis-cache service connected");
  } catch (err) {
    errorHandlerCreateClient(err);
  }
  return client;
};

module.exports = {
  createMainClientAndConnect,
  createClientAndConnect,
};

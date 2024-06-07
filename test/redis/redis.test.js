"use strict";

const cds = require("@sap/cds");
const xsenv = require("@sap/xsenv");
const redisMock = require("../_env/mocks/redis");
jest.mock("redis", () => require("../_env/mocks/redis"));
const redis = require("../../src/redis");

cds.test(__dirname + "/../_env");

jest.spyOn(xsenv, "serviceCredentials").mockReturnValue({ uri: "uri" });

const redisConfig = {
  a: 1,
};
const adapterOptions = {
  impl: "redis",
  local: true,
  config: redisConfig,
};

cds.env.websocket = {
  kind: "ws",
  adapter: adapterOptions,
};

describe("Redis", () => {
  beforeAll(async () => {});

  afterAll(async () => {});

  test("Client", async () => {
    const main = await redis.createPrimaryClientAndConnect(adapterOptions);
    expect(main).toBeDefined();
    expect(main.options).toMatchObject(redisConfig);
    const second = await redis.createSecondaryClientAndConnect(adapterOptions);
    expect(second).toBeDefined();
    expect(second.options).toMatchObject(redisConfig);
  });

  test("Client fail", async () => {
    const main = await redis.createPrimaryClientAndConnect(adapterOptions);
    expect(main).toBeDefined();
    main.error(new Error("Failed"));
    expect(main.on).toHaveBeenNthCalledWith(1, "error", expect.any(Function));
  });

  test("Client createClient exception", async () => {
    await redis.closeClients();
    redisMock.throwError("createClient");
    let main = await redis.createPrimaryClientAndConnect(adapterOptions);
    expect(main).toBeUndefined();
    redisMock.throwError("createClient");
    let secondary = await redis.createSecondaryClientAndConnect(adapterOptions);
    expect(secondary).toBeUndefined();
  });

  test("Client connect exception", async () => {
    await redis.closeClients();
    redisMock.throwError("connect");
    let main = await redis.createPrimaryClientAndConnect(adapterOptions);
    expect(main).toBeUndefined();
    redisMock.throwError("connect");
    let secondary = await redis.createSecondaryClientAndConnect(adapterOptions);
    expect(secondary).toBeUndefined();
  });

  test("Client error", async () => {
    await redis.closeClients();
    const main = await redis.createPrimaryClientAndConnect(adapterOptions);
    expect(main).toBeDefined();
    main.error(new Error("error"));
  });

  test("Client reconnect", async () => {
    await redis.closeClients();
    const main = await redis.createPrimaryClientAndConnect(adapterOptions);
    expect(main).toBeDefined();
    main.reconnect();
  });
});

"use strict";

const cds = require("@sap/cds");

const redis = require("../../src/redis");

const redisMock = require("../_env/mocks/redis");
jest.mock("redis", () => require("../_env/mocks/redis"));

cds.test(__dirname + "/../_env");

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
cds.env.requires["redis-websocket"].credentials = { uri: "uri" };

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

  test("Connection Check", async () => {
    expect(await redis.connectionCheck({ active: true, local: false })).toBe(true);
    expect(await redis.connectionCheck({ active: true, local: true })).toBe(true);
    expect(await redis.connectionCheck({ active: false, local: false })).toBe(false);
    expect(await redis.connectionCheck({ active: false, local: true })).toBe(false);
    expect(await redis.connectionCheck({ local: false })).toBe(false);
    expect(await redis.connectionCheck({ local: true })).toBe(true);
  });

  test("Adapter", async () => {
    expect(cds.ws.adapter).toBeDefined();
  });

  test("Adapter Error", async () => {
    redisMock.throwError("subscribe");
    cds.ws.adapter.on({}, "path");
    expect(cds.ws.adapter).toBeDefined();
  });
});

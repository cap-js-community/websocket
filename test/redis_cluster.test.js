"use strict";

const cds = require("@sap/cds");
const xsenv = require("@sap/xsenv");
const redisMock = require("./_env/mocks/redis");
jest.mock("redis", () => require("./_env/mocks/redis"));
const redis = require("../src/redis");

cds.test(__dirname + "/_env");

jest.spyOn(xsenv, "serviceCredentials").mockReturnValue({ uri: "uri", cluster_mode: true });

cds.env.websocket = {
  kind: "ws",
  adapter: {
    impl: "redis",
    local: true,
  },
};

describe("Redis", () => {
  beforeAll(async () => {});

  afterAll(async () => {});

  test("Client", async () => {
    const main = await redis.createPrimaryClientAndConnect();
    expect(main).toBeDefined();
    const second = await redis.createSecondaryClientAndConnect();
    expect(second).toBeDefined();
  });

  test("Client fail", async () => {
    const main = await redis.createPrimaryClientAndConnect();
    expect(main).toBeDefined();
    main.error(new Error("Failed"));
    expect(main.on).toHaveBeenNthCalledWith(1, "error", expect.any(Function));
  });

  test("Client createClient exception", async () => {
    await redis.closeClients();
    redisMock.throwError("createClient");
    let main = await redis.createPrimaryClientAndConnect();
    expect(main).toBeUndefined();
    redisMock.throwError("createClient");
    let secondary = await redis.createSecondaryClientAndConnect();
    expect(secondary).toBeUndefined();
  });

  test("Client connect exception", async () => {
    await redis.closeClients();
    redisMock.throwError("connect");
    let main = await redis.createPrimaryClientAndConnect();
    expect(main).toBeUndefined();
    redisMock.throwError("connect");
    let secondary = await redis.createSecondaryClientAndConnect();
    expect(secondary).toBeUndefined();
  });
});

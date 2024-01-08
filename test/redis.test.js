"use strict";

const cds = require("@sap/cds");
const xsenv = require("@sap/xsenv");
jest.mock("redis", () => require("./_env/mocks/redis"));
const redis = require("../src/redis");

cds.test(__dirname + "/_env");

jest.spyOn(xsenv, "serviceCredentials").mockReturnValue({ uri: "uri" });

describe("Redis", () => {
  beforeAll(async () => {});

  afterAll(() => {});

  test("Client", async () => {
    const main = await redis.createMainClientAndConnect();
    expect(main).toBeDefined();
    const second = await redis.createSecondClientAndConnect();
    expect(second).toBeDefined();
  });

  test("Client fail", async () => {
    const main = await redis.createMainClientAndConnect();
    expect(main).toBeDefined();
    main.error(new Error("Failed"));
  });
});

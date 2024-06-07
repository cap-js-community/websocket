"use strict";

const cds = require("@sap/cds");

const { connect, disconnect, emitEvent } = require("../_env/util/socket.io");
const xsenv = require("@sap/xsenv");

jest.spyOn(xsenv, "serviceCredentials").mockReturnValue({ uri: "uri" });

cds.test(__dirname + "/../_env");

const adapterOptions = {
  impl: __dirname + "/_env/mocks/redisCustomAdapter",
  local: true,
  options: {
    key: "websocket",
  },
};

cds.env.websocket = {
  kind: "socket.io",
  impl: null,
  adapter: adapterOptions,
};

describe("Redis", () => {
  let socket;

  beforeAll(async () => {
    socket = await connect("chat");
  });

  afterAll(async () => {
    await disconnect(socket);
  });

  test("Redis Custom Adapter", async () => {
    const result = await emitEvent(socket, "message", { text: "test" });
    expect(result).toBe("test");
  });
});

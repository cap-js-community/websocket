"use strict";

const cds = require("@sap/cds");

jest.mock("redis", () => require("../_env/mocks/redis"));

const { connect, disconnect, emitEvent } = require("../_env/util/socket.io");

cds.test(__dirname + "/../_env");

cds.env.websocket.kind = "socket.io";
cds.env.websocket.adapter = {
  impl: "./test/_env/mocks/redisCustomAdapter.js",
  local: true,
  options: {
    key: "websocket",
  },
};

describe("Redis", () => {
  let socket;

  beforeAll(async () => {
    socket = await connect("/ws/chat");
  });

  afterAll(async () => {
    await disconnect(socket);
  });

  test("Redis Custom Adapter", async () => {
    const result = await emitEvent(socket, "message", { text: "test" });
    expect(result).toBe("test");
  });
});

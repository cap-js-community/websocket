"use strict";

const cds = require("@sap/cds");
const redis = require("redis");
require("@socket.io/redis-streams-adapter");

jest.mock("redis", () => require("../_env/mocks/redis"));
jest.mock("@socket.io/redis-streams-adapter", () => require("../_env/mocks/redisStreamAdapter"));

const { connect, disconnect, emitEvent } = require("../_env/util/socket.io");

cds.test(__dirname + "/../_env");

cds.env.websocket.kind = "socket.io";
cds.env.websocket.adapter = {
  impl: "@socket.io/redis-streams-adapter",
  local: true,
  options: {
    key: "websocket",
  },
};
cds.env.requires["redis-websocket"].credentials = { uri: "uri" };

describe("Redis", () => {
  let socket;

  beforeAll(async () => {
    socket = await connect("/ws/chat");
  });

  afterAll(async () => {
    await disconnect(socket);
  });

  test("Redis Adapter", async () => {
    const result = await emitEvent(socket, "message", { text: "test" });
    expect(result).toBe("test");

    expect(redis.createClient).toHaveBeenCalledWith({ url: "uri" });
    expect(redis.client.connect).toHaveBeenCalledWith();
    expect(redis.client.on).toHaveBeenNthCalledWith(1, "error", expect.any(Function));
  });
});

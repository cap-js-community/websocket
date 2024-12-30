"use strict";

const cds = require("@sap/cds");
const redis = require("redis");

jest.mock("redis", () => require("../_env/mocks/redis"));

const { connect, disconnect, emitEvent, waitForEvent } = require("../_env/util/socket.io");

cds.test(__dirname + "/../_env");

cds.env.websocket.kind = "socket.io";
cds.env.websocket.adapter = {
  impl: "@socket.io/redis-adapter",
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
    disconnect(socket);
  });

  test("Redis Adapter", async () => {
    const waitResultPromise = waitForEvent(socket, "received");
    const result = await emitEvent(socket, "message", { text: "test" });
    expect(result).toBe("test");
    const waitResult = await waitResultPromise;
    expect(waitResult).toEqual({ text: "test", user: "alice" });

    expect(redis.createClient).toHaveBeenCalledWith({ url: "uri" });
    expect(redis.client.connect).toHaveBeenCalledWith();
    expect(redis.client.on).toHaveBeenNthCalledWith(1, "error", expect.any(Function));
    expect(redis.client.on).toHaveBeenNthCalledWith(2, "reconnecting", expect.any(Function));
    expect(redis.client.on).toHaveBeenNthCalledWith(3, "error", expect.any(Function));
    expect(redis.client.on).toHaveBeenNthCalledWith(4, "reconnecting", expect.any(Function));
    expect(redis.client.on).toHaveBeenNthCalledWith(5, "error", expect.any(Function));
    expect(redis.client.subscribe).toHaveBeenCalled();
    expect(redis.client.publish).toHaveBeenCalledWith("websocket#/ws/chat#/tenant:t1##", expect.anything());
  });
});

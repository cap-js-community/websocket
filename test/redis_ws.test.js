"use strict";

const cds = require("@sap/cds");
const xsenv = require("@sap/xsenv");

jest.mock("redis", () => require("./_env/mocks/redis"));
const redis = require("redis");

jest.spyOn(xsenv, "serviceCredentials").mockReturnValue({ uri: "uri" });

const { connect, disconnect, emitEvent, waitForEvent } = require("./_env/util/ws");

cds.test(__dirname + "/_env");

cds.env.websocket = {
  kind: "ws",
  adapter: {
    impl: "redis",
    local: true,
  },
};

describe("Redis", () => {
  let socket;

  beforeAll(async () => {
    socket = await connect("/ws/chat");
  });

  afterAll(() => {
    disconnect(socket);
  });

  test("Redis adapter", async () => {
    const waitResultPromise = waitForEvent(socket, "received");
    emitEvent(socket, "message", { text: "test" });
    const waitResult = await waitResultPromise;
    expect(waitResult).toEqual({ text: "test", user: "alice" });

    expect(redis.createClient).toHaveBeenCalledWith({ url: "uri" });
    expect(redis.client.connect).toHaveBeenCalledWith();
    expect(redis.client.on).toHaveBeenNthCalledWith(1, "error", expect.any(Function));
    expect(redis.client.subscribe).toHaveBeenNthCalledWith(1, "websocket/chat", expect.any(Function));
    expect(redis.client.subscribe).toHaveBeenNthCalledWith(2, "websocket/main", expect.any(Function));
    expect(redis.client.publish).toHaveBeenCalledWith(
      "websocket/chat",
      `{"event":"received","data":{"text":"test","user":"alice"}}`,
    );
  });
});

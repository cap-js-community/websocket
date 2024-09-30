"use strict";

const cds = require("@sap/cds");
const xsenv = require("@sap/xsenv");

jest.mock("redis", () => require("../_env/mocks/redis"));
const redis = require("redis");

const auth = require("../_env/util/auth");
const { connect, disconnect, emitEvent, waitForEvent, waitForNoEvent } = require("../_env/util/ws");

jest.spyOn(xsenv, "serviceCredentials").mockReturnValue({ uri: "uri" });

cds.test(__dirname + "/../_env");

cds.env.websocket = {
  kind: "ws",
  adapter: {
    impl: "redis",
    local: true,
  },
};

describe("Redis", () => {
  let socket;
  let socketOtherTenant;

  beforeAll(async () => {
    socket = await connect("/ws/chat");
    socketOtherTenant = await connect("/ws/chat", {
      authorization: auth.bob,
    });
  });

  afterAll(async () => {
    await disconnect(socket);
    await disconnect(socketOtherTenant);
  });

  test("Redis adapter", async () => {
    const messages = [];
    const waitResultPromise = waitForEvent(socket, "received", (message) => {
      messages.push(message);
    });
    const waitNoResultPromise = waitForNoEvent(socketOtherTenant, "received");
    await emitEvent(socket, "message", { text: "test" });
    const waitResult = await waitResultPromise;
    expect(waitResult).toEqual({ text: "test", user: "alice" });
    await waitNoResultPromise;

    expect(redis.createClient).toHaveBeenCalledWith({ url: "uri" });
    expect(redis.client.connect).toHaveBeenCalledWith();
    expect(redis.client.on).toHaveBeenNthCalledWith(1, "error", expect.any(Function));
    expect(redis.client.subscribe).toHaveBeenNthCalledWith(1, "websocket/chat", expect.any(Function));
    expect(redis.client.subscribe).toHaveBeenNthCalledWith(2, "websocket/cloudevent", expect.any(Function));
    expect(redis.client.subscribe).toHaveBeenNthCalledWith(3, "websocket/fns-websocket", expect.any(Function));
    expect(redis.client.subscribe).toHaveBeenNthCalledWith(4, "websocket/main", expect.any(Function));
    expect(redis.client.publish).toHaveBeenCalledWith(
      "websocket/chat",
      '{"event":"received","data":{"text":"test","user":"alice"},"tenant":"t1","headers":{"header":"value"}}',
    );

    // Duplicated because Redis mock publishes to same client (not done for real Redis)
    expect(messages).toEqual([
      {
        data: {
          text: "test",
          user: "alice",
        },
        event: "received",
      },
      {
        data: {
          text: "test",
          user: "alice",
        },
        event: "received",
      },
    ]);
  });
});

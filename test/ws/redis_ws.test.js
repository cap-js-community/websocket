"use strict";

const cds = require("@sap/cds");
const redis = require("redis");

jest.mock("redis", () => require("../_env/mocks/redis"));
const auth = require("../_env/util/auth");

const { connect, disconnect, emitEvent, waitForEvent, waitForNoEvent } = require("../_env/util/ws");

cds.test(__dirname + "/../_env");

cds.env.websocket = {
  kind: "ws",
  options: { skipUTF8Validation: true },
  adapter: {
    impl: "redis",
    local: true,
    options: { c: 1 },
    config: {
      a: 1,
      password: "12345",
      socket: {
        port: 6380,
        rejectUnauthorized: false,
      },
    },
  },
};
cds.env.requires["redis-websocket"].options = { b: 1 };
cds.env.requires["redis-websocket"].credentials = {
  hostname: "localhost",
  tls: true,
  port: 6379,
  password: "1234",
};

describe("Redis", () => {
  let socket;
  let socketOtherTenant;

  beforeAll(async () => {
    cds.env.requires.auth.users.alice.tenant = "t1";
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

    expect(redis.createClient).toHaveBeenCalledWith({
      a: 1,
      b: 1,
      password: "12345",
      socket: {
        host: "localhost",
        port: 6380,
        rejectUnauthorized: false,
        tls: true,
      },
    });
    expect(redis.client.connect).toHaveBeenCalledWith();
    expect(redis.client.on).toHaveBeenNthCalledWith(1, "error", expect.any(Function));
    expect(redis.client.subscribe).toHaveBeenNthCalledWith(1, "websocket/chat", expect.any(Function));
    expect(redis.client.subscribe).toHaveBeenNthCalledWith(2, "websocket/cloudevent", expect.any(Function));
    expect(redis.client.subscribe).toHaveBeenNthCalledWith(3, "websocket/cloudevents", expect.any(Function));
    expect(redis.client.subscribe).toHaveBeenNthCalledWith(4, "websocket/fns-websocket", expect.any(Function));
    expect(redis.client.subscribe).toHaveBeenNthCalledWith(5, "websocket/main", expect.any(Function));
    expect(redis.client.publish).toHaveBeenCalledWith(
      "websocket/chat",
      '{"tenant":"t1","event":"received","data":{"text":"test","user":"alice"},"headers":{"header":"value"}}',
    );

    // Duplicated because Redis mock publishes to same client (not done for real Redis)
    expect(messages).toEqual([
      {
        data: {
          text: "test",
          user: "alice",
        },
        event: "received",
        headers: {
          header: "value",
        },
      },
      {
        data: {
          text: "test",
          user: "alice",
        },
        event: "received",
        headers: {
          header: "value",
        },
      },
    ]);
  });
});

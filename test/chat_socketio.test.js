"use strict";

const cds = require("@sap/cds");

const { connect, disconnect, emitEvent, waitForEvent } = require("./_env/util/socketio");

cds.test(__dirname + "/_env");

cds.env.websocket = {
  kind: "socket.io",
};

describe("Chat", () => {
  let socket;

  beforeAll(async () => {
    socket = await connect("chat");
  });

  afterAll(() => {
    disconnect(socket);
  });

  test("Chat message", async () => {
    const waitResultPromise = waitForEvent(socket, "received");
    const result = await emitEvent(socket, "message", { text: "test" });
    expect(result).toBe("test");
    const waitResult = await waitResultPromise;
    expect(waitResult).toEqual({ text: "test", user: "alice" });
  });
});

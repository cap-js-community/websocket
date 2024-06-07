"use strict";

const cds = require("@sap/cds");

const { connect, disconnect, emitEvent, waitForEvent } = require("../_env/util/ws");

cds.test(__dirname + "/../_env");

describe("Chat", () => {
  let socket;
  let socketOther;

  beforeAll(async () => {
    socket = await connect("/ws/chat");
    socketOther = await connect("/ws/chat");
  });

  afterAll(async () => {
    await disconnect(socket);
    await disconnect(socketOther);
  });

  test("Chat message", async () => {
    const waitResultPromise = waitForEvent(socket, "received");
    const waitOtherResultPromise = waitForEvent(socketOther, "received");
    await emitEvent(socket, "message", { text: "test" });
    const waitResult = await waitResultPromise;
    expect(waitResult).toEqual({ text: "test", user: "alice" });
    const waitOtherResult = await waitOtherResultPromise;
    expect(waitOtherResult).toEqual({ text: "test", user: "alice" });
  });
});

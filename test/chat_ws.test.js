"use strict";

const cds = require("@sap/cds");

const { connect, disconnect, emitEvent, waitForEvent } = require("./_env/util/ws");

cds.test(__dirname + "/_env");

describe("Chat", () => {
  let socket;

  beforeAll(async () => {
    socket = await connect("/ws/chat");
  });

  afterAll(() => {
    disconnect(socket);
  });

  test("Chat message", async () => {
    const waitResultPromise = waitForEvent(socket, "received");
    emitEvent(socket, "message", { text: "test" });
    const waitResult = await waitResultPromise;
    expect(waitResult).toEqual({ text: "test" });
  });
});

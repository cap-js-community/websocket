"use strict";

const cds = require("@sap/cds");

const { connect, disconnect, emitEvent, waitForEvent } = require("../_env/util/socket.io");

cds.test(__dirname + "/../_env");

cds.requires.toggles = true;

cds.env.websocket.kind = "socket.io";

let socket;

describe("Toggles", () => {
  beforeAll(async () => {
    socket = await connect("/ws/main");
  });

  afterAll(async () => {
    await disconnect(socket);
  });

  test("Check", async () => {
    const eventResultPromise = waitForEvent(socket, "customEvent");
    const result = await emitEvent(socket, "triggerCustomEvent", { num: 1, text: "test" });
    expect(result).toBe("test1");
    const eventResult = await eventResultPromise;
    expect(eventResult.text).toBe("test1");
  });
});

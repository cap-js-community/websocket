"use strict";

const cds = require("@sap/cds");

const { connect, disconnect, emitEvent, waitForEvent } = require("../_env/util/ws");

cds.test(__dirname + "/../_env");

cds.requires.toggles = true;

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
    expect(result).toBeNull();
    const eventResult = await eventResultPromise;
    expect(eventResult.text).toBe("test1");
  });
});

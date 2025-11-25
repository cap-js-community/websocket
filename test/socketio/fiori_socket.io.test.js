"use strict";

const cds = require("@sap/cds");

const { connect, disconnect, waitForEvent } = require("../_env/util/socket.io");
const auth = require("../_env/util/auth");

cds.test(__dirname + "/../_env");

cds.env.websocket.kind = "socket.io";

const pcpMessage = `pcp-action:MESSAGE
pcp-channel:sideeffects
sideEffectSource:/Books(201)
sideEffectEventName:stockChanged
serverAction:RaiseSideEffect

`;

describe("Fiori", () => {
  let socket;

  beforeAll(async () => {
    socket = await connect("/ws/fiori");
  });

  afterAll(async () => {
    await disconnect(socket);
  });

  test("Fiori Side Effects", async () => {
    const waitStockChangedPromise = waitForEvent(socket, "stockChanged");
    await fetch(cds.server.url + "/odata/v4/fiori/Books(201)/FioriService.submitOrder", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: auth.alice },
      body: JSON.stringify({ quantity: 1 }),
    });
    const waitStockChanged = await waitStockChangedPromise;
    expect(waitStockChanged).toEqual(pcpMessage);
  });
});

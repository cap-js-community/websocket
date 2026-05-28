"use strict";

const cds = require("@sap/cds");

const { connect, disconnect, waitForMessage } = require("../_env/util/ws");
const auth = require("../_env/util/auth");

cds.test(__dirname + "/../_env");

const pcpMessage = `pcp-action:MESSAGE
pcp-channel:sideeffects
sideEffectSource:/Books(201)
sideEffectEventName:stockChanged
serverAction:RaiseSideEffect

`;

describe("Guest Billing", () => {
  let socket;

  beforeAll(async () => {
    socket = await connect("/ws/guest-billing");
  });

  afterAll(async () => {
    await disconnect(socket);
  });

  test("Fiori Side Effects", async () => {
    expect(cds.services["GuestBillingService"].path).toBe("/odata/v4/guest-billing");
    expect(cds.services["GuestBillingService"].definition["@Common.WebSocketBaseURL"]).toBe("ws/guest-billing");
    const waitStockChangedPromise = waitForMessage(socket, "stockChanged");
    await fetch(cds.server.url + "/odata/v4/guest-billing/Books(201)/GuestBillingService.submitOrder", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: auth.alice },
      body: JSON.stringify({ quantity: 1 }),
    });
    const waitStockChanged = await waitStockChangedPromise;
    expect(waitStockChanged).toEqual(pcpMessage);
  });
});

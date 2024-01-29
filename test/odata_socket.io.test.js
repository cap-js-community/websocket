"use strict";

const cds = require("@sap/cds");

const auth = require("./_env/util/auth");
const { connect, disconnect, emitEvent, waitForEvent } = require("./_env/util/socket.io");

cds.test(__dirname + "/_env");

cds.env.websocket = {
  kind: "socket.io",
};

describe("OData", () => {
  let socket;
  let service;

  beforeAll(async () => {
    socket = await connect("odata");
    service = await cds.connect.to("TodoService");
  });

  afterAll(async () => {
    await disconnect(socket);
  });

  test("Event", async () => {
    const waitReceivedPromise = waitForEvent(socket, "received");
    const waitReceivedTooPromise = waitForEvent(socket, "receivedToo");
    const response = await fetch(cds.server.url + "/odata/v4/odata/Header", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: auth.alice },
      body: JSON.stringify({ name: "Test" }),
    });
    const result = await response.json();
    expect(result.ID).toBeDefined();
    const ID = result.ID;
    const waitResult = await waitReceivedPromise;
    expect(waitResult).toMatchObject({ ID });
    const waitResultToo = await waitReceivedTooPromise;
    expect(waitResultToo).toMatchObject({ ID });
  });
});

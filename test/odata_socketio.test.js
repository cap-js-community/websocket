"use strict";

const cds = require("@sap/cds");

const { connect, disconnect, emitEvent, waitForEvent } = require("./_env/util/socketio");
const { authorization } = require("./_env/util/common");

cds.test(__dirname + "/_env");

cds.env.requires.websocket = {
  kind: "socket.io",
};

describe("OData", () => {
  let socket;
  let service;

  beforeAll(async () => {
    socket = await connect("odata");
    service = await cds.connect.to("TodoService");
  });

  afterAll(() => {
    disconnect(socket);
  });

  test("Event", async () => {
    const waitReceivedPromise = waitForEvent(socket, "received");
    const waitReceivedTooPromise = waitForEvent(socket, "receivedToo");
    const response = await fetch(cds.server.url + "/odata/v4/odata/Header", {
      method: "POST",
      headers: { "content-type": "application/json", authorization },
      body: JSON.stringify({ name: "Test" }),
    });
    const result = await response.json();
    expect(result.ID).toBeDefined();
    const ID = result.ID;
    const waitResult = await waitReceivedPromise;
    expect(waitResult).toMatchObject({});
    const waitResultToo = await waitReceivedTooPromise;
    expect(waitResultToo).toMatchObject({});
  });
});

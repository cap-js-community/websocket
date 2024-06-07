"use strict";

const cds = require("@sap/cds");

const auth = require("../_env/util/auth");
const { connect, disconnect, waitForEvent } = require("../_env/util/socket.io");
const { waitForNoEvent } = require("../_env/util/ws");

cds.test(__dirname + "/../_env");

cds.env.websocket = {
  kind: "socket.io",
  impl: null,
};

describe("OData", () => {
  let socket;
  let socketOther;

  beforeAll(async () => {
    socket = await connect("odata", { id: 1234 });
    socketOther = await connect("odata", { id: 5678 });
    await cds.connect.to("TodoService");
  });

  afterAll(async () => {
    await disconnect(socket);
  });

  test("Identifier Event", async () => {
    const waitEventPromise = waitForEvent(socket, "identifierEvent");
    let waitEventOtherPromise = waitForEvent(socketOther, "identifierEvent");
    let response = await fetch(cds.server.url + "/odata/v4/odata/HeaderItem", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: auth.alice },
      body: JSON.stringify({ name: "Test" }),
    });
    let result = await response.json();
    expect(result.ID).toBeDefined();
    let ID = result.ID;
    let waitResult = await waitEventPromise;
    expect(waitResult).toMatchObject({ ID });
    let waitResultToo = await waitEventOtherPromise;
    expect(waitResultToo).toMatchObject({ ID });

    let waitNoEventPromise = waitForNoEvent(socket, "identifierEvent");
    waitEventOtherPromise = waitForEvent(socketOther, "identifierEvent");
    response = await fetch(cds.server.url + "/odata/v4/odata/HeaderItem", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: auth.alice },
      body: JSON.stringify({ name: "Test", description: "1234" }),
    });
    result = await response.json();
    expect(result.ID).toBeDefined();
    ID = result.ID;
    await waitNoEventPromise;
    waitResultToo = await waitEventOtherPromise;
    expect(waitResultToo).toMatchObject({ ID });

    waitNoEventPromise = waitForNoEvent(socket, "identifierEvent");
    waitEventOtherPromise = waitForEvent(socketOther, "identifierEvent");
    await fetch(cds.server.url + "/odata/v4/odata/message(text='1234')", {
      method: "GET",
      headers: { "content-type": "application/json", authorization: auth.alice },
    });
    await waitNoEventPromise;
    waitResultToo = await waitEventOtherPromise;
    expect(waitResultToo).toEqual("1234");
  });
});

"use strict";

const cds = require("@sap/cds");

const auth = require("../_env/util/auth");
const {
  connect,
  disconnect,
  waitForEvent,
  waitForNoEvent,
  enterContext,
  exitContext,
} = require("../_env/util/socket.io");
const { wait } = require("../_env/util/common");

cds.test(__dirname + "/../_env");

cds.env.websocket.kind = "socket.io";

describe("Identifier", () => {
  let socket;
  let socketOther;

  beforeAll(async () => {
    socket = await connect("/ws/odata", { id: 1234 });
    socketOther = await connect("/ws/odata", { id: 5678 });
  });

  afterAll(async () => {
    await disconnect(socket);
    await disconnect(socketOther);
  });

  test("Identifier Include Event", async () => {
    let waitEventPromise = waitForEvent(socket, "identifierIncludeEvent");
    let waitEventOtherPromise = waitForEvent(socketOther, "identifierIncludeEvent");
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
    const waitOtherResult = await waitEventOtherPromise;
    expect(waitOtherResult).toMatchObject({ ID });

    waitEventPromise = waitForEvent(socket, "identifierIncludeEvent");
    let waitNoEventOtherPromise = waitForNoEvent(socketOther, "identifierIncludeEvent");
    response = await fetch(cds.server.url + "/odata/v4/odata/HeaderItem", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: auth.alice },
      body: JSON.stringify({ name: "Test", description: "1234" }),
    });
    result = await response.json();
    expect(result.ID).toBeDefined();
    ID = result.ID;
    waitResult = await waitEventPromise;
    expect(waitResult).toMatchObject({ ID });
    await waitNoEventOtherPromise;

    waitEventPromise = waitForEvent(socket, "identifierIncludeEvent");
    waitNoEventOtherPromise = waitForNoEvent(socketOther, "identifierIncludeEvent");
    await fetch(cds.server.url + "/odata/v4/odata/message(text='1234')", {
      method: "GET",
      headers: { "content-type": "application/json", authorization: auth.alice },
    });
    waitResult = await waitEventPromise;
    expect(waitResult).toEqual({ text: "1234" });
    await waitNoEventOtherPromise;

    const context = "1234";
    await enterContext(socket, context);
    await wait();
    waitEventPromise = waitForEvent(socket, "identifierIncludeContextEvent");
    waitNoEventOtherPromise = waitForNoEvent(socketOther, "identifierIncludeContextEvent");
    await fetch(cds.server.url + "/odata/v4/odata/message(text='1234')", {
      method: "GET",
      headers: { "content-type": "application/json", authorization: auth.alice },
    });
    waitResult = await waitEventPromise;
    expect(waitResult).toEqual({ text: "1234" });
    await waitNoEventOtherPromise;
  });

  test("Identifier Exclude Event", async () => {
    const waitEventPromise = waitForEvent(socket, "identifierExcludeEvent");
    let waitEventOtherPromise = waitForEvent(socketOther, "identifierExcludeEvent");
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
    let waitResultOther = await waitEventOtherPromise;
    expect(waitResultOther).toMatchObject({ ID });

    let waitNoEventPromise = waitForNoEvent(socket, "identifierExcludeEvent");
    waitEventOtherPromise = waitForEvent(socketOther, "identifierExcludeEvent");
    response = await fetch(cds.server.url + "/odata/v4/odata/HeaderItem", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: auth.alice },
      body: JSON.stringify({ name: "Test", description: "1234" }),
    });
    result = await response.json();
    expect(result.ID).toBeDefined();
    ID = result.ID;
    await waitNoEventPromise;
    waitResultOther = await waitEventOtherPromise;
    expect(waitResultOther).toMatchObject({ ID });

    waitNoEventPromise = waitForNoEvent(socket, "identifierExcludeEvent");
    waitEventOtherPromise = waitForEvent(socketOther, "identifierExcludeEvent");
    await fetch(cds.server.url + "/odata/v4/odata/message(text='1234')", {
      method: "GET",
      headers: { "content-type": "application/json", authorization: auth.alice },
    });
    await waitNoEventPromise;
    waitResultOther = await waitEventOtherPromise;
    expect(waitResultOther).toEqual({ text: "1234" });

    const context = "1234";
    await enterContext(socketOther, context);
    await wait();
    waitNoEventPromise = waitForNoEvent(socket, "identifierExcludeContextEvent");
    waitEventOtherPromise = waitForEvent(socketOther, "identifierExcludeContextEvent");
    await fetch(cds.server.url + "/odata/v4/odata/message(text='1234')", {
      method: "GET",
      headers: { "content-type": "application/json", authorization: auth.alice },
    });
    await waitNoEventPromise;
    waitResultOther = await waitEventOtherPromise;
    expect(waitResultOther).toEqual({ text: "1234" });

    await exitContext(socketOther, ID);
    await wait();
  });
});

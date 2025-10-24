"use strict";

const cds = require("@sap/cds");

const auth = require("../_env/util/auth");

const { connect, disconnect, emitEvent, emitMessage, waitForEvent } = require("../_env/util/socket.io");

cds.test(__dirname + "/../_env");

cds.env.websocket.kind = "socket.io";

const pcpMessage = `pcp-action:MESSAGE
text:test

`;

describe("Todo", () => {
  let socketOData;
  let socketFns;
  let socket;

  beforeAll(async () => {
    socketOData = await connect("/ws/todo");
    socketFns = await connect("/ws/fns-websocket");
    socket = await connect("/ws/todo-ws");
  });

  afterAll(async () => {
    await disconnect(socketOData);
    await disconnect(socketFns);
    await disconnect(socket);
  });

  test("Todo message", async () => {
    const waitRefreshODataPromise = waitForEvent(socketOData, "refresh");
    const waitNotifyODataPromise = waitForEvent(socketFns, "notify");
    const waitRefreshPromise = waitForEvent(socket, "refresh");
    let response = await fetch(cds.server.url + "/odata/v4/todo/Todo", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: auth.alice },
      body: JSON.stringify({ name: "Buy milk" }),
    });
    let result = await response.json();
    expect(result.ID).toBeDefined();
    const ID = result.ID;
    response = await fetch(
      cds.server.url + `/odata/v4/todo/Todo(ID=${ID},IsActiveEntity=false)/TodoService.draftActivate`,
      {
        method: "POST",
        headers: { "content-type": "application/json", authorization: auth.alice },
        body: JSON.stringify({}),
      },
    );
    result = await response.json();
    expect(result.ID).toBeDefined();
    expect(result.IsActiveEntity).toBe(true);
    const waitODataResult = await waitRefreshODataPromise;
    expect(waitODataResult).toMatchObject({ ID });
    const waitNotifyResult = await waitNotifyODataPromise;
    expect(waitNotifyResult).toEqual(`pcp-action:MESSAGE
pcp-event:notify
pcp-body-type:text
text:4711

`);
    const waitResult = await waitRefreshPromise;
    expect(waitResult).toMatchObject({ ID });
  });

  test("Todo operation", async () => {
    const waitNotifyODataPromise = waitForEvent(socketFns, "notifyOp");
    const result = await emitEvent(socketOData, "chat", { text: "test" });
    expect(result).toBeNull();
    const waitODataResult = await waitNotifyODataPromise;
    expect(waitODataResult).toMatchObject({
      text: "test",
    });
  });

  test("Todo operation mixin path", async () => {
    const waitNotifyODataPromise = waitForEvent(socketFns, "notifyOp");
    const result = await emitMessage(socketFns, "chat", pcpMessage);
    expect(result).toBeNull();
    const waitODataResult = await waitNotifyODataPromise;
    expect(waitODataResult).toMatchObject({
      text: "test",
    });
  });
});

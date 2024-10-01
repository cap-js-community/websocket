"use strict";

const cds = require("@sap/cds");

const auth = require("../_env/util/auth");
const { connect, disconnect, waitForEvent, waitForMessage } = require("../_env/util/ws");

cds.test(__dirname + "/../_env");

describe("Fns", () => {
  let socket;
  let socketFns;

  beforeAll(async () => {
    socket = await connect("/ws/todo-ws");
    socketFns = await connect("/ws/fns-websocket");
  });

  afterAll(async () => {
    await disconnect(socket);
    await disconnect(socketFns);
  });

  test("Todo message", async () => {
    const waitRefreshPromise = waitForEvent(socket, "refresh");
    const waitNotifyPromise = waitForMessage(socketFns, "notify");
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
    const waitResult = await waitRefreshPromise;
    expect(waitResult).toMatchObject({ ID });
    const waitFnsResult = await waitNotifyPromise;
    expect(waitFnsResult).toEqual(`pcp-action:MESSAGE
pcp-event:notify
pcp-body-type:text
text:4711

`);
  });
});

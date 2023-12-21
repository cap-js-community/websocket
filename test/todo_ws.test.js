"use strict";

const cds = require("@sap/cds");

const { connect, disconnect, emitEvent, waitForEvent } = require("./_env/util/ws");
const { authorization } = require("./_env/util/common");

cds.test(__dirname + "/_env");

describe("Todo", () => {
  let socket;
  let service;

  beforeAll(async () => {
    socket = await connect("/ws/todo");
    service = await cds.connect.to("TodoService");
  });

  afterAll(() => {
    disconnect(socket);
  });

  test("Todo message", async () => {
    const waitRefreshPromise = waitForEvent(socket, "refresh");
    let response = await fetch(cds.server.url + "/odata/v4/todo/Todo", {
      method: "POST",
      headers: { "content-type": "application/json", authorization, },
      body: JSON.stringify({ name: "Buy milk" }),
    });
    let result = await response.json();
    expect(result.ID).toBeDefined();
    const ID = result.ID;
    response = await fetch(
      cds.server.url + `/odata/v4/todo/Todo(ID=${ID},IsActiveEntity=false)/TodoService.draftActivate`,
      {
        method: "POST",
        headers: { "content-type": "application/json", authorization },
        body: JSON.stringify({}),
      },
    );
    result = await response.json();
    expect(result.ID).toBeDefined();
    expect(result.IsActiveEntity).toBe(true);
    const waitResult = await waitRefreshPromise;
    expect(waitResult).toMatchObject({ ID });
  });
});

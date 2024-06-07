"use strict";

const cds = require("@sap/cds");

const auth = require("../_env/util/auth");
const { connect, disconnect, waitForEvent } = require("../_env/util/ws");

cds.test(__dirname + "/../_env");

describe("Todo", () => {
  let socket;

  beforeAll(async () => {
    socket = await connect("/ws/todo");
    await cds.connect.to("TodoService");
  });

  afterAll(async () => {
    await disconnect(socket);
  });

  test("Todo message", async () => {
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
    const waitResult = await waitRefreshPromise;
    expect(waitResult).toMatchObject({ ID });
  });
});

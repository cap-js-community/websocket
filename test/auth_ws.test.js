"use strict";

const cds = require("@sap/cds");

const { connect, disconnect, emitEvent, waitForEvent } = require("./_env/util/ws");
const { invalidAuthorization } = require("./_env/util/common");

cds.test(__dirname + "/_env");

describe("Auth", () => {
  let socket;

  beforeAll(async () => {
    socket = await connect("/ws/chat", {
      authorization: invalidAuthorization,
    });
  });

  afterAll(() => {
    disconnect(socket);
  });

  test("Invalid Auth", async () => {
    await new Promise((resolve) => {
      socket.on("close", (code, reason) => {
        expect(code).toEqual(4401);
        expect(String(reason)).toEqual(`{"error":{"code":"401","message":"Unauthorized"}}`);
        resolve();
      });
    })
    emitEvent(socket, "message", { text: "test" });
    cds.ws.close(socket);
    cds.ws.close();
  });
});

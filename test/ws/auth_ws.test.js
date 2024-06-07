"use strict";

const cds = require("@sap/cds");

const auth = require("../_env/util/auth");
const { connect, disconnect, emitEvent } = require("../_env/util/ws");

cds.test(__dirname + "/../_env");

describe("Auth", () => {
  let socket;

  beforeAll(async () => {
    socket = await connect("/ws/chat", {
      authorization: auth.invalid,
    });
  });

  afterAll(async () => {
    await disconnect(socket);
  });

  test("Invalid Auth", async () => {
    await new Promise((resolve) => {
      socket.on("close", (code, reason) => {
        expect(code).toEqual(4401);
        expect(String(reason)).toEqual(`{"error":{"code":"401","message":"Unauthorized"}}`);
        resolve();
      });
    });
    await emitEvent(socket, "message", { text: "test" });
    cds.ws.close(socket);
    cds.ws.close();
  });
});

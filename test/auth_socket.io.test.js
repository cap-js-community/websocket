"use strict";

const cds = require("@sap/cds");

const { connect, disconnect, emitEvent } = require("./_env/util/socket.io");
const auth = require("./_env/util/auth");

cds.test(__dirname + "/_env");

cds.env.websocket = {
  kind: "socket.io",
};

describe("Auth", () => {
  let socket;

  beforeAll(async () => {
    socket = await connect("chat", {
      authorization: auth.invalid,
    });
  });

  afterAll(async () => {
    await disconnect(socket);
  });

  // TODO: CDS basic-auth does not call next(err). Socket.IO client is not connected and promise is pending
  test.skip("Invalid Auth", async () => {
    await new Promise((resolve) => {
      socket.on("disconnect", (event) => {
        expect(event).toBeDefined();
        resolve();
      });
    });
    await emitEvent(socket, "message", { text: "test" });
    cds.ws.close(socket);
    cds.ws.close();
  });
});

"use strict";

const cds = require("@sap/cds");

const { connect, disconnect, emitEvent, waitForEvent } = require("./_env/util/socketio");
const { invalidAuthorization } = require("./_env/util/common");

cds.test(__dirname + "/_env");

cds.env.websocket = {
  kind: "socket.io",
};

describe("Auth", () => {
  let socket;

  beforeAll(async () => {
    socket = await connect("chat", {
      authorization: invalidAuthorization,
    });
  });

  afterAll(() => {
    disconnect(socket);
  });

  // TODO: CDS basic-auth does not call next(err). Socket.IO client is not connected and promise is pending
  test.skip("Invalid Auth", async () => {
    await new Promise((resolve) => {
      socket.on("disconnect", () => {
        resolve();
      });
    })
    emitEvent(socket, "message", { text: "test" });
    cds.ws.close(socket);
    cds.ws.close();
  });
});

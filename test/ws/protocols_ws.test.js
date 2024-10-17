"use strict";

const cds = require("@sap/cds");

const { connect, waitForEvent, emitEvent } = require("../_env/util/ws");

cds.test(__dirname + "/../_env");

const protocols = [
  "protocol-websocket",
  "protocol-ws",
  "protocol-annotation-websocket",
  "protocol-annotation-ws",
  "protocol-path",
  // "protocol-absolute-path",
  "protocol-multiple-websocket",
  // "protocol-multiple-ws-absolute",
];

describe("Protocols", () => {
  afterAll(() => {
    cds.ws.close();
  });

  test.each(protocols)("Protocol - %p", async (protocol) => {
    const socket = await connect(protocol.includes("absolute") ? "/" + protocol : "/ws/" + protocol);
    const waitProtocol = waitForEvent(socket, "test");
    await emitEvent(socket, "trigger", { text: protocol });
    const waitResult = await waitProtocol;
    expect(waitResult).toMatchObject({ text: protocol });
    socket.close();
  });
});

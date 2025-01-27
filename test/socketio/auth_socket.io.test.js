"use strict";

const cds = require("@sap/cds");

const { connect } = require("../_env/util/socket.io");
const auth = require("../_env/util/auth");

cds.test(__dirname + "/../_env");

cds.env.websocket.kind = "socket.io";
cds.env.requires.auth.login_required = false;

describe("Auth", () => {
  afterAll(() => {
    cds.ws.close();
  });

  test("Invalid Auth", async () => {
    await expect(
      connect("/ws/chat", {
        authorization: auth.invalid,
      }),
    ).rejects.toThrow(new Error("401"));
  });

  test("Empty Auth", async () => {
    await expect(
      connect("/ws/chat", {
        authorization: "",
      }),
    ).rejects.toThrow(new Error("401"));
  });

  test("Invalid Path", async () => {
    await expect(
      connect("/ws/chat2", {
        serverSocket: false,
      }),
    ).rejects.toThrow(new Error("Invalid namespace"));
  });
});

"use strict";

const cds = require("@sap/cds");

const { connect } = require("../_env/util/socket.io");
const auth = require("../_env/util/auth");

cds.test(__dirname + "/../_env");

cds.env.websocket = {
  kind: "socket.io",
  impl: null,
};

describe("Auth", () => {
  test("Invalid Auth", async () => {
    await expect(
      connect("chat", {
        authorization: auth.invalid,
      }),
    ).rejects.toThrow(new Error("401"));
    cds.ws.close();
  });
});

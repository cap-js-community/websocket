"use strict";

const cds = require("@sap/cds");

const auth = require("../_env/util/auth");
const { connect } = require("../_env/util/ws");

cds.test(__dirname + "/../_env");

describe("Auth", () => {
  afterAll(() => {
    cds.ws.close();
  });

  test("Invalid Auth", async () => {
    await expect(
      connect("/ws/chat", {
        authorization: auth.invalid,
      }),
    ).rejects.toThrow(new Error("Unexpected server response: 401"));
  });

  test("Invalid Path", async () => {
    await expect(
      connect("/ws/chat2", {
        serverSocket: false,
      }),
    ).rejects.toThrow(new Error("Unexpected server response: 404"));
    cds.ws.close();
  });
});

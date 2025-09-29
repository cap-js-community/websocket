"use strict";

const cds = require("@sap/cds");
const auth = require("../_env/util/auth");
const { wait } = require("../_env/util/common");

cds.test(__dirname + "/../_env");

describe("Client", () => {
  let client;

  beforeAll(async () => {
    const port = cds.app.server.address().port;
    client = await cds.connect.to("ws-client", {
      url: `ws://localhost:${port}/ws/chat`,
      headers: {
        authorization: auth.alice,
      },
    });
  });

  afterAll(async () => {
    client.disconnect();
    cds.ws.close();
  });

  test("Chat message", async () => {
    const received = new Promise((resolve) => {
      client.on("received", (message) => {
        resolve(message);
      });
    });
    client.enterContext("chat");
    client.enterContext("test");
    client.exitContext("test");
    await wait();
    client.resetContexts();
    await wait();
    client.emit("message", { text: "test" });
    const result = await received;
    expect(result.data).toEqual({ text: "test", user: "alice" });
  });
});

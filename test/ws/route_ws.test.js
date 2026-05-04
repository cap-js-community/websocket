"use strict";

const cds = require("@sap/cds");
const WebSocket = require("ws");

const auth = require("../_env/util/auth");
const { connect } = require("../_env/util/ws");

cds.test(__dirname + "/../_env");

const path = "/xxx/custom";

describe("Route", () => {
  let socket;

  beforeAll(async () => {
    cds.ws.route(path, (request, socket, head) => {
      cds.wss.handleUpgrade(request, socket, head, (ws) => {
        ws.on("message", (message) => {
          ws.send(`echo:${message}`);
        });
      });
    });
    const port = cds.app.server.address().port;
    socket = new WebSocket(`ws://localhost:${port}${path}`, [], {
      headers: {
        authorization: auth.alice,
      },
    });
    await new Promise((resolve, reject) => {
      socket.once("open", resolve);
      socket.once("error", reject);
    });
  });

  afterAll(() => {
    socket.close();
    cds.ws.close();
  });

  test("Custom route", async () => {
    const response = new Promise((resolve) => {
      socket.on("message", (message) => {
        resolve(message.toString());
      });
    });
    socket.send("test");
    const result = await response;
    expect(result).toBe("echo:test");
  });

  test("Unregistered path still returns 404", async () => {
    await expect(
      connect("/ws/unknown", {
        serverSocket: false,
      }),
    ).rejects.toThrow(new Error("Unexpected server response: 404"));
  });

  test("Service path still works", async () => {
    const socket = await connect("/ws/chat");
    expect(socket.readyState).toBe(WebSocket.OPEN);
    socket.close();
  });
});

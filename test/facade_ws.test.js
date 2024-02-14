"use strict";

const cds = require("@sap/cds");

const { connect, disconnect, waitForEvent, waitForNoEvent } = require("./_env/util/ws");

cds.test(__dirname + "/_env");

describe("Chat", () => {
  let socket;
  let socketOther;

  beforeAll(async () => {
    socket = await connect("/ws/chat");
    socketOther = await connect("/ws/chat");
  });

  afterAll(async () => {
    await disconnect(socket);
    await disconnect(socketOther);
  });

  test("Facade", async () => {
    const facade = socket.serverSocket.facade;
    expect(facade).toBeDefined();
    expect(facade.service).toEqual("/chat");
    expect(facade.socket).toBeDefined();
    const context = facade.context;
    expect(context).toBeDefined();
    expect(context.id).toEqual(expect.any(String));
    expect(context.user).toEqual(
      expect.objectContaining({
        id: "alice",
      }),
    );
    expect(context.tenant).toEqual("t1");
    expect(context.http.req).toEqual(expect.any(Object));
    expect(context.http.res).toEqual(expect.any(Object));
    expect(context.ws.service).toEqual(facade);
    expect(context.ws.socket).toEqual(facade.socket);
    expect(facade.on).toEqual(expect.any(Function));
    expect(facade.emit).toEqual(expect.any(Function));
    expect(facade.broadcast).toEqual(expect.any(Function));
    expect(facade.broadcastAll).toEqual(expect.any(Function));
    expect(facade.enter).toEqual(expect.any(Function));
    expect(facade.exit).toEqual(expect.any(Function));
    expect(facade.disconnect).toEqual(expect.any(Function));
    expect(facade.onDisconnect).toEqual(expect.any(Function));
    const waitResultPromise = waitForEvent(socket, "message");
    const waitNoResultPromise = waitForNoEvent(socketOther, "message");
    expect(facade.emit("message", { text: "test" })).toEqual(expect.any(Promise));
    const waitResult = await waitResultPromise;
    expect(waitResult).toEqual({ text: "test" });
    await waitNoResultPromise;
  });
});

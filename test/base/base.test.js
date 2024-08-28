"use strict";

const cds = require("@sap/cds");

const SocketServer = require("../../src/socket/base");
const BaseAdapter = require("../../src/adapter/base");
const BaseFormat = require("../../src/format/base");

cds.env.websocket = {
  adapter: null,
};

describe("Base", () => {
  beforeAll(async () => {});

  afterAll(async () => {});

  test("Server Instance", async () => {
    const socketServer = new SocketServer({}, "/ws", {});
    expect(socketServer).toBeDefined();
    let socket;
    const connected = (_socket) => {
      socket = _socket;
    };
    socketServer.setup();
    socketServer.broadcast({}, "path", "event");
    expect(socketServer.defaultPath({ path: "/ws/chat" })).toEqual("/chat");
    socketServer.service({}, "test", connected);
    expect(socket).toEqual({
      service: expect.any(Object),
      path: "test",
      socket: null,
      context: expect.any(Object),
      on: expect.any(Function),
      emit: expect.any(Function),
      enter: expect.any(Function),
      exit: expect.any(Function),
      broadcast: expect.any(Function),
      broadcastAll: expect.any(Function),
      disconnect: expect.any(Function),
      onDisconnect: expect.any(Function),
    });
    expect(socket.context).toMatchObject({
      id: null,
      user: null,
      tenant: null,
      http: { req: null, res: null },
      ws: { service: expect.any(Object), socket: null },
    });
    expect(socket.on()).toBeUndefined();
    expect(socket.emit()).toEqual(expect.any(Promise));
    expect(socket.broadcast()).toEqual(expect.any(Promise));
    expect(socket.broadcastAll()).toEqual(expect.any(Promise));
    expect(socket.enter()).toEqual(expect.any(Promise));
    expect(socket.exit()).toEqual(expect.any(Promise));
    expect(socket.disconnect()).toBeUndefined();
    expect(socket.onDisconnect()).toBeUndefined();
  });

  test("Adapter Instance", async () => {
    const baseAdapter = new BaseAdapter();
    await expect(baseAdapter.on({}, "/chat")).resolves.toBeUndefined();
    await expect(baseAdapter.emit({}, "/chat", "test")).resolves.toBeUndefined();
  });

  test("Format Instance", async () => {
    const baseFormat = new BaseFormat();
    expect(baseFormat.parse({})).toBeUndefined();
    expect(baseFormat.compose("test", {})).toBeUndefined();
  });

  test("Mock Response", async () => {
    const socketServer = new SocketServer();
    const req = {};
    const next = jest.fn();
    socketServer.mockResponse({ request: req }, next);
    expect(req.res).toBeDefined();
    expect(req.res.headers).toEqual({});
    expect(req.res.set("A", "B")).toBe(req.res);
    expect(req.res.headers).toEqual({
      A: "B",
    });
    expect(req.res.set("x-correlation-id", "123")).toBe(req.res);
    expect(req.correlationId).toEqual("123");
    expect(req.res.headers).toEqual({
      A: "B",
      "x-correlation-id": "123",
    });
    expect(req.res.setHeader("X", "Y")).toBe(req.res);
    expect(req.res.headers).toEqual({
      A: "B",
      X: "Y",
      "x-correlation-id": "123",
    });
    expect(req.res.status(200)).toBe(req.res);
    expect(req.res.statusCode).toEqual(200);
    expect(
      req.res.writeHead(201, "Created", {
        X: "Z",
      }),
    ).toBe(req.res);
    expect(req.res.statusCode).toEqual(201);
    expect(req.res.headers).toEqual({
      A: "B",
      X: "Z",
      "x-correlation-id": "123",
    });
    expect(req.res.json({ A: 1 })).toBe(req.res);
    expect(req.res.body).toEqual('{"A":1}');
    expect(req.res.sendStatus(200)).toBe(req.res);
    expect(req.res.send("Good Day!")).toBe(req.res);
    expect(req.res.body).toEqual("Good Day!");
    expect(req.res.end()).toBe(req.res);
    expect(req.res.on()).toBe(req.res);
    expect(next).toHaveBeenCalled();
  });

  test("Mock Auth", async () => {
    cds.env.requires.auth.kind = "mocked";
    const request = {
      headers: {
        authorization: "",
        cookie: "X-Authorization=Basic YWxpY2U6YWxpY2U",
      },
    };
    const next = jest.fn();
    const socketServer = new SocketServer();
    socketServer.applyAuthCookie({ request }, next);
    expect(request.headers.authorization).toEqual("Basic YWxpY2U6YWxpY2U");
    expect(next).toHaveBeenCalled();
  });
});

"use strict";

const cds = require("@sap/cds");

const SocketServer = require("../src/socket/base");

describe("Base", () => {
  beforeAll(async () => {});

  afterAll(() => {});

  test("Instance", async () => {
    const socketServer = new SocketServer();
    expect(socketServer).toBeDefined();
    let socket;
    const connected = (_socket) => {
      socket = _socket;
    };
    socketServer.service("test", connected);
    expect(socket).toEqual({
      socket: null,
      setup: expect.any(Function),
      context: expect.any(Function),
      on: expect.any(Function),
      emit: expect.any(Function),
      broadcast: expect.any(Function),
      disconnect: expect.any(Function),
    });
  });

  test("Mock Response", async () => {
    const req = {};
    SocketServer.mockResponse(req);
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
    expect(req.res.body).toEqual({ A: 1 });
    expect(req.res.send("Good Day!")).toBe(req.res);
    expect(req.res.body).toEqual("Good Day!");
    expect(req.res.end()).toBe(req.res);
    expect(req.res.on()).toBe(req.res);
  });

  test("Mock Auth", async () => {
    cds.env.requires.auth.kind = "mocked";
    const request = {
      headers: {
        authorization: "",
        cookie: "X-Authorization=Basic YWxpY2U6YWxpY2U",
      },
    };
    SocketServer.applyAuthCookie(request);
    expect(request.headers.authorization).toEqual("Basic YWxpY2U6YWxpY2U");
  });
});

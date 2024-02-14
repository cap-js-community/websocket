"use strict";

const cds = require("@sap/cds");
const WebSocket = require("ws");

const auth = require("./auth");

async function connect(service, options = {}) {
  const port = cds.app.server.address().port;
  const socket = new WebSocket(`ws://localhost:${port}` + service, {
    headers: {
      authorization: options?.authorization || auth.alice,
    },
  });
  cds.wss.once("connection", async (serverSocket) => {
    socket.serverSocket = serverSocket;
  });
  return new Promise((resolve, reject) => {
    socket.once("open", () => {
      resolve(socket);
    });
    socket.once("error", reject);
  });
}

async function disconnect(socket) {
  cds.ws.close();
  socket.close();
}

async function emitEvent(socket, event, data) {
  return new Promise((resolve) => {
    socket.send(
      JSON.stringify({
        event,
        data,
      }),
      (result) => {
        resolve(result || null);
      },
    );
  });
}

async function waitForEvent(socket, event, cb) {
  return new Promise((resolve) => {
    socket.on("message", (message) => {
      const payload = JSON.parse(message);
      if (payload.event === event) {
        resolve(payload.data);
        cb && cb(payload);
      }
    });
  });
}

async function waitForNoEvent(socket, event, timeout = 100) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      resolve();
    }, timeout);
    socket.on("message", (message) => {
      const payload = JSON.parse(message);
      if (payload.event === event) {
        clearTimeout(timeoutId);
        reject(payload.data);
      }
    });
  });
}

async function enterContext(socket, context) {
  return await emitEvent(socket, "wsContext", { context });
}

async function exitContext(socket, context) {
  return await emitEvent(socket, "wsContext", { context, exit: true });
}

module.exports = {
  connect,
  disconnect,
  emitEvent,
  waitForEvent,
  waitForNoEvent,
  enterContext,
  exitContext,
};

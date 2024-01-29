"use strict";

const cds = require("@sap/cds");
const ioc = require("socket.io-client");

const auth = require("./auth");

async function connect(service, options = {}) {
  const port = cds.app.server.address().port;
  const socket = ioc(`http://localhost:${port}/${service}`, {
    path: "/ws",
    extraHeaders: {
      authorization: options?.authorization || auth.alice,
    },
  });
  cds.io.of(service).on("connection", (serverSocket) => {
    socket.serverSocket = serverSocket;
  });
  return new Promise((resolve, reject) => {
    socket.on("connect", () => {
      resolve(socket);
    });
    socket.on("connect_error", reject);
  });
}

async function disconnect(socket) {
  cds.ws.close();
  socket.disconnect();
}

async function emitEvent(socket, event, data) {
  return new Promise((resolve, reject) => {
    socket.emit(event, data, (result) => {
      if (result?.error) {
        reject(result);
      } else {
        resolve(result);
      }
    });
  });
}

async function waitForEvent(socket, event) {
  return new Promise((resolve) => {
    socket.once(event, resolve);
  });
}

async function waitForNoEvent(socket, event, timeout = 100) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      resolve();
    }, timeout);
    socket.once(event, (result) => {
      clearTimeout(timeoutId);
      reject(result);
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

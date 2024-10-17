"use strict";

const cds = require("@sap/cds");
const ioc = require("socket.io-client");

const auth = require("./auth");

async function connect(service, options = {}, headers) {
  const port = cds.app.server.address().port;
  const socket = ioc(`http://localhost:${port}/${service}${options?.id ? `?id=${options?.id}` : ""}`, {
    path: options.absolute ? undefined : "/ws",
    extraHeaders: {
      authorization: options?.authorization || auth.alice,
      ...headers,
    },
  });
  cds.io.of(service).once("connection", (serverSocket) => {
    socket.serverSocket = serverSocket;
  });
  return new Promise((resolve, reject) => {
    socket.once("connect", () => {
      resolve(socket);
    });
    socket.once("connect_error", (err) => {
      reject(err);
    });
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
        reject(result?.error);
      } else {
        resolve(result);
      }
    });
  });
}

async function emitMessage(socket, event, message) {
  return new Promise((resolve) => {
    socket.emit(event, message);
    resolve(null);
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
    }, timeout).unref();
    socket.once(event, (result) => {
      clearTimeout(timeoutId);
      reject(new Error(JSON.stringify(result)));
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
  emitMessage,
  waitForEvent,
  waitForNoEvent,
  enterContext,
  exitContext,
};

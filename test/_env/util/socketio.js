"use strict";

const cds = require("@sap/cds");
const ioc = require("socket.io-client");

const { authorization } = require("./common");

async function connect(service) {
  return new Promise((resolve, reject) => {
    const port = cds.app.server.address().port;
    const socket = ioc(`http://localhost:${port}/${service}`, {
      path: "/ws",
      extraHeaders: {
        authorization,
      },
    });
    cds.io.of(service).on("connection", (serverSocket) => {
      socket.serverSocket = serverSocket;
    });
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

module.exports = {
  connect,
  disconnect,
  emitEvent,
  waitForEvent,
};

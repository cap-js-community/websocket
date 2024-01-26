"use strict";

const cds = require("@sap/cds");
const WebSocket = require("ws");

const { authorization } = require("./common");

async function connect(service, options = {}) {
  const port = cds.app.server.address().port;
  const socket = new WebSocket(`ws://localhost:${port}` + service, {
    headers: {
      authorization: options?.authorization || authorization,
    },
  });
  cds.wss.on("connection", async (serverSocket) => {
    socket.serverSocket = serverSocket;
  });
  return new Promise((resolve, reject) => {
    socket.on("open", () => {
      resolve(socket);
    });
    socket.on("error", reject);
  });
}

async function disconnect(socket) {
  cds.ws.close();
  socket.close();
}

function emitEvent(socket, event, data) {
  socket.send(
    JSON.stringify({
      event,
      data,
    }),
  );
}

async function waitForEvent(socket, event) {
  return new Promise((resolve) => {
    socket.on("message", (message) => {
      const payload = JSON.parse(message);
      if (payload.event === event) {
        resolve(payload.data);
      }
    });
  });
}

module.exports = {
  connect,
  disconnect,
  emitEvent,
  waitForEvent,
};

"use strict";

const cds = require("@sap/cds");
const WebSocket = require("ws");

const { authorization } = require("./common");

async function connect(service) {
  return new Promise((resolve) => {
    const port = cds.app.server.address().port;
    const socket = new WebSocket(`ws://localhost:${port}` + service, {
      headers: {
        authorization,
      },
    });
    socket.on("open", () => {
      resolve(socket);
    });
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

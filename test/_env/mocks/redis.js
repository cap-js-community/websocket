"use strict";

const onMessage = [];
const onSubscribe = [];
const onError = [];

let createClientError = false;
let connectError = false;

const client = {
  connect: jest.fn(() => {
    if (connectError) {
      connectError = false;
      throw new Error("connect error");
    }
  }),
  on: jest.fn((event, cb) => {
    switch (event) {
      case "message":
        onMessage.push(cb);
        break;
      case "error":
        onError.push(cb);
        break;
    }
  }),
  xAdd: jest.fn(() => {}),
  subscribe: jest.fn((channel, cb) => {
    onSubscribe.push(cb);
  }),
  pSubscribe: jest.fn(() => {}),
  publish: jest.fn((channel, message) => {
    for (const on of onMessage) {
      on(channel, message);
    }
    for (const on of onSubscribe) {
      on(message, channel);
    }
  }),
  error: jest.fn((err) => {
    for (const on of onError) {
      on(err);
    }
  }),
};

module.exports = {
  client,
  throwError(kind) {
    switch (kind) {
      case "createClient":
        createClientError = true;
        break;
      case "connect":
        connectError = true;
        break;
    }
  },
  createClient: jest.fn(() => {
    if (createClientError) {
      createClientError = false;
      throw new Error("create client error");
    }
    return client;
  }),
  createCluster: jest.fn(() => {
    if (createClientError) {
      createClientError = false;
      throw new Error("create cluster error");
    }
    return client;
  }),
};

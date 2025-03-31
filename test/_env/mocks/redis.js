"use strict";

const onMessage = [];
const onSubscribe = [];
const onError = [];
const onReconnecting = [];

let createClientError = false;
let connectError = false;
let subscribeError = false;
let counter = {};

const client = {
  connect: jest.fn(() => {
    if (connectError) {
      connectError = false;
      throw new Error("connect error");
    }
  }),
  quit: jest.fn(),
  on: jest.fn((event, cb) => {
    switch (event) {
      case "message":
        onMessage.push(cb);
        break;
      case "error":
        onError.push(cb);
        break;
      case "reconnecting":
        onReconnecting.push(cb);
        break;
    }
  }),
  xRead: jest.fn(() => {
    return Promise.resolve([{ messages: [] }]);
  }),
  xAdd: jest.fn(() => {
    return Promise.resolve();
  }),
  off: jest.fn(),
  get: jest.fn((key) => {
    return counter[key];
  }),
  set: jest.fn((key, value) => {
    counter[key] = value;
    return "OK";
  }),
  incr: jest.fn((key) => {
    counter[key]++;
    return counter[key];
  }),
  decr: jest.fn((key) => {
    counter[key]--;
    return counter[key];
  }),
  subscribe: jest.fn((channel, cb) => {
    if (subscribeError) {
      subscribeError = false;
      throw new Error("subscribe error");
    }
    onSubscribe.push(cb);
    return Promise.resolve();
  }),
  sSubscribe: jest.fn(),
  pSubscribe: jest.fn(),
  unsubscribe: jest.fn(),
  pUnsubscribe: jest.fn(),
  publish: jest.fn((channel, message) => {
    for (const on of onMessage) {
      on(channel, message);
    }
    for (const on of onSubscribe) {
      on(message, channel);
    }
    return Promise.resolve();
  }),
  error: jest.fn((err) => {
    for (const on of onError) {
      on(err);
    }
  }),
  reconnect: jest.fn((err) => {
    for (const on of onReconnecting) {
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
      case "subscribe":
        subscribeError = true;
        break;
    }
  },
  createClient: jest.fn((options) => {
    if (createClientError) {
      createClientError = false;
      throw new Error("create client error");
    }
    client.options = options;
    return client;
  }),
  createCluster: jest.fn((options) => {
    if (createClientError) {
      createClientError = false;
      throw new Error("create cluster error");
    }
    client.options = options;
    return client;
  }),
  commandOptions: jest.fn(() => {
    return {};
  }),
};

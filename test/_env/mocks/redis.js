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
  connect: vi.fn(() => {
    if (connectError) {
      connectError = false;
      throw new Error("connect error");
    }
  }),
  quit: vi.fn(),
  on: vi.fn((event, cb) => {
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
  xRead: vi.fn(() => {
    return Promise.resolve([{ messages: [] }]);
  }),
  xAdd: vi.fn(() => {
    return Promise.resolve();
  }),
  off: vi.fn(),
  get: vi.fn((key) => {
    return counter[key];
  }),
  set: vi.fn((key, value) => {
    counter[key] = value;
    return "OK";
  }),
  incr: vi.fn((key) => {
    counter[key]++;
    return counter[key];
  }),
  decr: vi.fn((key) => {
    counter[key]--;
    return counter[key];
  }),
  subscribe: vi.fn((channel, cb) => {
    if (subscribeError) {
      subscribeError = false;
      throw new Error("subscribe error");
    }
    onSubscribe.push(cb);
    return Promise.resolve();
  }),
  sSubscribe: vi.fn(),
  pSubscribe: vi.fn(),
  unsubscribe: vi.fn(),
  pUnsubscribe: vi.fn(),
  publish: vi.fn((channel, message) => {
    for (const on of onMessage) {
      on(channel, message);
    }
    for (const on of onSubscribe) {
      on(message, channel);
    }
    return Promise.resolve();
  }),
  error: vi.fn((err) => {
    for (const on of onError) {
      on(err);
    }
  }),
  reconnect: vi.fn((err) => {
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
  createClient: vi.fn((options) => {
    if (createClientError) {
      createClientError = false;
      throw new Error("create client error");
    }
    client.options = options;
    return client;
  }),
  createCluster: vi.fn((options) => {
    if (createClientError) {
      createClientError = false;
      throw new Error("create cluster error");
    }
    client.options = options;
    return client;
  }),
  commandOptions: vi.fn(() => {
    return {};
  }),
};

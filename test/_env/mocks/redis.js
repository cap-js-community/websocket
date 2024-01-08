"use strict";

const onMessage = [];
const onError = [];

const client = {
  connect: jest.fn(() => {}),
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
  subscribe: jest.fn(() => {}),
  pSubscribe: jest.fn(() => {}),
  publish: jest.fn((key, value) => {
    for (const on of onMessage) {
      on(key, value);
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
  createClient: jest.fn(() => {
    return client;
  }),
  createCluster: jest.fn(() => {
    return client;
  }),
};

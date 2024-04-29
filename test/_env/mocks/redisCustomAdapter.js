"use strict";

const adapter = {
  addAll: jest.fn(),
  delAll: jest.fn(),
  del: jest.fn(),
  broadcast: jest.fn(),
  persistSession: jest.fn(),
  socketRooms: jest.fn(() => {
    return new Set();
  }),
  close: jest.fn(),
};

module.exports = {
  createAdapter: (server, options, config) => {
    adapter.server = server;
    adapter.options = options;
    adapter.config = config;
    return function (nsp) {
      adapter.nsp = nsp;
      return adapter;
    };
  },
};

"use strict";

const adapter = {
  init: vi.fn(),
  addAll: vi.fn(),
  delAll: vi.fn(),
  del: vi.fn(),
  broadcast: vi.fn(),
  persistSession: vi.fn(),
  socketRooms: vi.fn(() => {
    return new Set();
  }),
  close: vi.fn(),
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

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
  createAdapter: () => {
    return function (nsp) {
      adapter.nsp = nsp;
      return adapter;
    };
  },
};

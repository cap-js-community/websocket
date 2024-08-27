"use strict";

class IdentityFormat {
  constructor(service) {
    this.service = service;
  }

  parse(data) {
    return {
      event: undefined,
      data,
    };
  }

  compose(event, data) {
    return data;
  }
}

module.exports = IdentityFormat;

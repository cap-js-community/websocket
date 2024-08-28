"use strict";

const BaseFormat = require("./base");

class IdentityFormat extends BaseFormat {
  constructor(service) {
    super(service);
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

"use strict";

const BaseFormat = require("./base");

class IdentityFormat extends BaseFormat {
  constructor(service, origin) {
    super(service, origin);
  }

  parse(data) {
    return {
      event: undefined,
      data,
      headers: {},
    };
  }

  compose(event, data, headers) {
    return data;
  }
}

module.exports = IdentityFormat;

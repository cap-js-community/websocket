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
    };
  }

  compose(event, data, headers) {
    return data;
  }
}

module.exports = IdentityFormat;

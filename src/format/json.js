"use strict";

const cds = require("@sap/cds");

const BaseFormat = require("./base");

const LOG = cds.log("/websocket/json");

class JSONFormat extends BaseFormat {
  constructor(service, origin) {
    super(service, origin);
  }

  parse(data) {
    let payload;
    try {
      payload = JSON.parse(data);
    } catch (err) {
      LOG?.warn("Error parsing json format", data, err);
      return {
        event: undefined,
        data: {},
        headers: {},
      };
    }
    if (payload?.event && payload?.data) {
      return payload;
    }
    return {
      event: "message",
      data: payload,
      headers: {},
    };
  }

  compose(event, data, headers) {
    return JSON.stringify({
      event,
      data,
      headers,
    });
  }
}

module.exports = JSONFormat;

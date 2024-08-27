"use strict";

const cds = require("@sap/cds");
const LOG = cds.log("/websocket/json");

class JSONFormat {
  constructor(service) {
    this.service = service;
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
      };
    }
    if (payload?.event && payload?.data) {
      return payload;
    }
    return {
      event: "message",
      data: payload,
    };
  }

  compose(event, data) {
    return JSON.stringify({
      event,
      data,
    });
  }
}

module.exports = JSONFormat;

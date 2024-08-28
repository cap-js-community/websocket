"use strict";

const cds = require("@sap/cds");

const BaseFormat = require("./base");

const LOG = cds.log("/websocket/json");

class JSONFormat extends BaseFormat {
  constructor(service) {
    super(service);
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

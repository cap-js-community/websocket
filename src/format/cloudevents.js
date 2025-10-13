"use strict";

const CloudEventFormat = require("./cloudevent");
const cds = require("@sap/cds");

class CloudEventsFormat extends CloudEventFormat {
  constructor(service, origin) {
    super(service, origin);
    this.name = "cloudevents";
    this.identifier = "type";
    this.LOG = cds.log(`websocket/${this.name}`);
  }
}

module.exports = CloudEventsFormat;

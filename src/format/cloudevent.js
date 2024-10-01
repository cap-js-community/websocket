"use strict";

const cds = require("@sap/cds");

const GenericFormat = require("./generic");

class CloudEventFormat extends GenericFormat {
  constructor(service, origin) {
    super(service, origin, "cloudevent", "type");
  }

  parse(data) {
    data = this.deserialize(data);
    const operation = this.determineOperation(data);
    if (typeof data?.data === "object" && !operation?.params?.data) {
      const ceData = data.data;
      delete data.data;
      data = {
        ...data,
        ...ceData,
      };
    }
    return super.parse(data);
  }

  compose(event, data, headers) {
    let cloudEvent = {
      specversion: "1.0",
      type: `${this.service.name}.${event}`,
      source: this.service.name,
      subject: null,
      id: cds.utils.uuid(),
      time: new Date().toISOString(),
      datacontenttype: "application/json",
      data: {},
    };
    const eventDefinition = this.service.events()[event];
    if (eventDefinition?.elements?.data && data.data) {
      cloudEvent = {
        ...data,
      };
    } else {
      cloudEvent.data = data;
    }
    const result = super.compose(event, data, headers);
    cloudEvent = {
      ...cloudEvent,
      ...result,
    };
    return this.serialize(cloudEvent);
  }
}

module.exports = CloudEventFormat;

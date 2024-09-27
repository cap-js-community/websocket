"use strict";

const cds = require("@sap/cds");

const BaseFormat = require("./base");

const LOG = cds.log("/websocket/cloudevent");

class CloudEventFormat extends BaseFormat {
  constructor(service, origin) {
    super(service, origin);
  }

  parse(data) {
    try {
      const cloudEvent = data?.constructor === Object ? data : JSON.parse(data);
      // TODO: Map to CAP operation

    } catch (err) {
      LOG?.error(err);
    }
    LOG?.warn("Error parsing cloud-event format", data);
    return {
      event: undefined,
      data: {},
    };
  }

  compose(event, data, headers) {
    const cloudEvent = {
      specversion: "1.0",
      type: `${this.service.name}.${event}`,
      source: this.service.name,
      subject: null,
      id: cds.utils.uuid(),
      time: new Date().toISOString(),
      datacontenttype: "application/json",
      data,
    };
    const annotations = this.collectAnnotations(event);
    for (const annotation of annotations) {
      const value = this.deriveValue(event, data, headers, {
        headerValues: [`cloudevent-${annotation}`, `cloudevent_${annotation}`, `cloudevent.${annotation}`, `cloudevent${annotation}`, annotation],
        annotationValues: [`@websocket.cloudevent.${annotation}`, `@ws.cloudevent.${annotation}`],
      });
      if (value !== undefined) {
        cloudEvent[annotation] = value;
      }
    }
    return this.origin === "json" ? cloudEvent : JSON.stringify(cloudEvent);
  }

  collectAnnotations(event) {
    const annotations = new Set();
    const eventDefinition = this.service.events()[event];
    for (const annotation in eventDefinition) {
      if (annotation.startsWith("@websocket.cloudevent.")) {
        annotations.add(annotation.substring("@websocket.cloudevent.".length));
      }
      if (annotation.startsWith("@ws.cloudevent.")) {
        annotations.add(annotation.substring("@ws.cloudevent.".length));
      }
    }
    const eventElements = Object.values(eventDefinition?.elements || {});
    for (const element of eventElements) {
      for (const annotation in element) {
        if (annotation.startsWith("@websocket.cloudevent.")) {
          annotations.add(annotation.substring("@websocket.cloudevent.".length));
        }
        if (annotation.startsWith("@ws.cloudevent.")) {
          annotations.add(annotation.substring("@ws.cloudevent.".length));
        }
      }
    }
    return annotations;
  }
}

module.exports = CloudEventFormat;

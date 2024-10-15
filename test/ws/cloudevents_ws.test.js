"use strict";

const cds = require("@sap/cds");

const { connect, disconnect, emitMessage, waitForMessage } = require("../_env/util/ws");

cds.test(__dirname + "/../_env");

const cloudEvent = {
  specversion: "1.0",
  type: "com.example.someevent",
  source: "/mycontext",
  subject: null,
  id: "C234-1234-1234",
  time: "2018-04-05T17:31:00Z",
  comexampleextension1: "value",
  comexampleothervalue: 5,
  datacontenttype: "application/json",
  data: {
    appinfoA: "abc",
    appinfoB: 123,
    appinfoC: true,
  },
};

describe("CloudEvents", () => {
  let socket;

  beforeAll(async () => {
    socket = await connect(
      "/ws/cloudevents",
      {},
      {
        "Sec-WebSocket-Protocol": "cloudevents.json",
      },
      ["cloudevents.json"],
    );
  });

  afterAll(async () => {
    await disconnect(socket);
  });

  test("Event Cloud Protocol", async () => {
    expect(socket._protocol).toEqual("cloudevents.json");
  });

  test("Cloud event", async () => {
    const waitCloudEventPromise = waitForMessage(socket, "cloudEvent", null, true);
    const result = await emitMessage(socket, JSON.stringify(cloudEvent));
    expect(result).toBeNull();
    const waitResult = await waitCloudEventPromise;
    expect(waitResult).toEqual({
      specversion: "1.0",
      type: "CloudEventsService.cloudEvent",
      source: "CloudEventsService",
      subject: null,
      id: expect.any(String),
      data: {
        appinfoA: "abc",
        appinfoB: 123,
        appinfoC: true,
      },
      datacontenttype: "application/json",
      time: expect.any(String),
    });
  });

  test("Cloud event format error", async () => {
    const result = await emitMessage(socket, "This is not a Cloud Event message!");
    expect(result).toEqual(null);
  });
});

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

const cloudEventModel = {
  ...cloudEvent,
  type: "com.example.someevent.model",
};

const cloudEventMap = {
  ...cloudEvent,
  type: "com.example.someevent.map",
};

const cloudEvent1 = {
  specversion: "1.0",
  type: "CloudEventService.cloudEvent1",
  source: "CloudEventService",
  subject: null,
  id: expect.any(String),
  time: expect.any(String),
  datacontenttype: "application/json",
  data: {
    appinfoA: "abcd",
    appinfoB: 1234,
    appinfoC: false,
  },
};

const cloudEvent2 = {
  ...cloudEvent1,
  specversion: "1.1",
  type: "com.example.someevent.cloudEvent2",
  source: "/mycontext",
  subject: "example",
  comexampleextension1: "value",
  comexampleothervalue: 5,
  datacontenttype: "application/cloudevents+json",
};

const cloudEvent3 = {
  ...cloudEvent2,
  type: "com.example.someevent.cloudEvent3",
};

const cloudEvent4 = {
  ...cloudEvent3,
  comexampleextension1: "value2",
  type: "com.example.someevent.cloudEvent4",
};

const cloudEvent5 = {
  ...cloudEvent4,
  comexampleextension1: "value",
  type: "com.example.someevent.cloudEvent5",
};

describe("CloudEvent", () => {
  let socket;

  beforeAll(async () => {
    socket = await connect(
      "/ws/cloudevent",
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

  test("Cloud event (modeling)", async () => {
    const waitCloudEvent1Promise = waitForMessage(socket, "cloudEvent1", null, true);
    const waitCloudEvent2Promise = waitForMessage(socket, "cloudEvent2", null, true);
    const waitCloudEvent3Promise = waitForMessage(socket, "cloudEvent3", null, true);
    const waitCloudEvent4Promise = waitForMessage(socket, "cloudEvent4", null, true);
    const waitCloudEvent5Promise = waitForMessage(socket, "cloudEvent5", null, true);
    const result = await emitMessage(socket, JSON.stringify(cloudEventModel));
    expect(result).toBeNull();
    const waitResult1 = await waitCloudEvent1Promise;
    expect(waitResult1).toEqual(cloudEvent1);
    const waitResult2 = await waitCloudEvent2Promise;
    expect(waitResult2).toEqual(cloudEvent2);
    const waitResult3 = await waitCloudEvent3Promise;
    expect(waitResult3).toEqual(cloudEvent3);
    const waitResult4 = await waitCloudEvent4Promise;
    expect(waitResult4).toEqual(cloudEvent4);
    const waitResult5 = await waitCloudEvent5Promise;
    expect(waitResult5).toEqual(cloudEvent5);
  });

  test("Cloud event (mapping)", async () => {
    const waitCloudEvent1Promise = waitForMessage(socket, "cloudEvent1", null, true);
    const waitCloudEvent2Promise = waitForMessage(socket, "cloudEvent2", null, true);
    const waitCloudEvent3Promise = waitForMessage(socket, "cloudEvent3", null, true);
    const waitCloudEvent4Promise = waitForMessage(socket, "cloudEvent4", null, true);
    const waitCloudEvent5Promise = waitForMessage(socket, "cloudEvent5", null, true);
    const result = await emitMessage(socket, JSON.stringify(cloudEventMap));
    expect(result).toBeNull();
    const waitResult1 = await waitCloudEvent1Promise;
    expect(waitResult1).toEqual(cloudEvent1);
    const waitResult2 = await waitCloudEvent2Promise;
    expect(waitResult2).toEqual(cloudEvent2);
    const waitResult3 = await waitCloudEvent3Promise;
    expect(waitResult3).toEqual({ ...cloudEvent3, subject: "cloud-example" });
    const waitResult4 = await waitCloudEvent4Promise;
    expect(waitResult4).toEqual({ ...cloudEvent4, subject: "cloud-example" });
    const waitResult5 = await waitCloudEvent5Promise;
    expect(waitResult5).toEqual({ ...cloudEvent5, subject: "cloud-example" });
  });

  test("Cloud event format error", async () => {
    const result = await emitMessage(socket, "This is not a Cloud Event message!");
    expect(result).toEqual(null);
  });
});

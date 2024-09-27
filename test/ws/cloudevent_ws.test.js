"use strict";

const cds = require("@sap/cds");

const { connect, disconnect, emitMessage, waitForMessage } = require("../_env/util/ws");

cds.test(__dirname + "/../_env");

const cloudEvent1Message = JSON.stringify({
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
});

const cloudEvent2Message = JSON.stringify({
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
});

const cloudEvent3Message = JSON.stringify({
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
});

const cloudEvent4Message = JSON.stringify({
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
});

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

  test.skip("Event Cloud Event", async () => {
    const waitCloudEvent1Promise = waitForMessage(socket, "cloudEvent1");
    const waitCloudEvent2Promise = waitForMessage(socket, "cloudEvent2");
    const waitCloudEvent3Promise = waitForMessage(socket, "cloudEvent3");
    const waitCloudEvent4Promise = waitForMessage(socket, "cloudEvent4");
    const result = await emitMessage(socket, cloudEvent1Message);
    expect(result).toBeNull();
    const waitResult1 = await waitCloudEvent1Promise;
    expect(waitResult1).toEqual(cloudEvent1Message);
    const waitResult2 = await waitCloudEvent2Promise;
    expect(waitResult2).toEqual(cloudEvent2Message);
    const waitResult3 = await waitCloudEvent3Promise;
    expect(waitResult3).toEqual(cloudEvent3Message);
    const waitResult4 = await waitCloudEvent4Promise;
    expect(waitResult4).toEqual(cloudEvent3Message);
  });

  test("Cloud event format error", async () => {
    const result = await emitMessage(socket, "This is not a Cloud Event message!");
    expect(result).toEqual(null);
  });
});

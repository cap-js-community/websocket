"use strict";

const cds = require("@sap/cds");

const { connect, disconnect, emitEvent, emitMessage, waitForEvent } = require("../_env/util/socket.io");

cds.test(__dirname + "/../_env");

cds.env.websocket = {
  kind: "socket.io",
  impl: null,
};

const pcpMessage = `pcp-action:MESSAGE
pcp-body-type:text
field1:value1
field2:value2

this is the body!`;

const pcpMessage1 = `pcp-action:MESSAGE
pcp-event:notification1
pcp-body-type:text
field1:value1
field2:value2

this is the body!`;

const pcpMessage2 = `pcp-action:MESSAGE2
pcp-event:notification2
pcp-body-type:text
field1:value1
field2:value2

this is the body!`;

const pcpMessage3 = `pcp-action:MESSAGE
pcp-event:notification3
pcp-body-type:text
field1:value1
field2:value2

`;

describe("PCP", () => {
  let socket;

  beforeAll(async () => {
    socket = await connect("pcp");
  });

  afterAll(async () => {
    await disconnect(socket);
  });

  test("Event Notification", async () => {
    const waitNotification1Promise = waitForEvent(socket, "notification1");
    const waitNotification2Promise = waitForEvent(socket, "notification2");
    const waitNotification3Promise = waitForEvent(socket, "notification3");
    const result = await emitEvent(socket, "sendNotification", pcpMessage);
    expect(result).toBe(true);
    const waitResult1 = await waitNotification1Promise;
    expect(waitResult1).toEqual(pcpMessage1);
    const waitResult2 = await waitNotification2Promise;
    expect(waitResult2).toEqual(pcpMessage2);
    const waitResult3 = await waitNotification3Promise;
    expect(waitResult3).toEqual(pcpMessage3);
  });

  test("PCP format error", async () => {
    const result = await emitMessage(socket, "This is not a PCP message!");
    expect(result).toEqual(null);
  });
});

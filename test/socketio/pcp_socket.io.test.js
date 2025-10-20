"use strict";

const cds = require("@sap/cds");

const { connect, disconnect, emitEvent, emitMessage, waitForEvent } = require("../_env/util/socket.io");
const { wait } = require("../_env/util/common");

cds.test(__dirname + "/../_env");

cds.env.websocket.kind = "socket.io";

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

const pcpMessage4 = `pcp-action:ABC
pcp-event:notification4
pcp-body-type:text
action:MESSAGE
field1:value1
field2:value2

Header`;

const pcpMessageContext = `pcp-action:wsContext
pcp-event:wsContext
pcp-body-type:text
context:context
exit:false
reset:true

Header`;

const pcpMessageWithContext = `pcp-action:MESSAGE_CONTEXT
pcp-body-type:text
field1:value1
field2:value2

this is the body!`;

const pcpTriggerSideEffects = `pcp-action:triggerSideEffects

`;

const pcpSideEffect1 = `pcp-action:MESSAGE
pcp-channel:amc\\://notification/notify
sideEffectsSource:/Header(ID='e0582b6a-6d93-46d9-bd28-98723a285d40')
sideEffectsEventName:sideEffect1
serverAction:RaiseSideEffect

`;

describe("PCP", () => {
  let socket;

  beforeAll(async () => {
    socket = await connect("/ws/pcp");
  });

  afterAll(async () => {
    await disconnect(socket);
  });

  test("Event Notification", async () => {
    const waitNotification1Promise = waitForEvent(socket, "notification1");
    const waitNotification2Promise = waitForEvent(socket, "notification2");
    const waitNotification3Promise = waitForEvent(socket, "notification3");
    const waitNotification4Promise = waitForEvent(socket, "notification4");
    const result = await emitEvent(socket, "sendNotification", pcpMessage);
    expect(result).toBe(true);
    const waitResult1 = await waitNotification1Promise;
    expect(waitResult1).toEqual(pcpMessage1);
    const waitResult2 = await waitNotification2Promise;
    expect(waitResult2).toEqual(pcpMessage2);
    const waitResult3 = await waitNotification3Promise;
    expect(waitResult3).toEqual(pcpMessage3);
    const waitResult4 = await waitNotification4Promise;
    expect(waitResult4).toEqual(pcpMessage4);
  });

  test("PCP format error", async () => {
    const result = await emitMessage(socket, "This is not a PCP message!");
    expect(result).toEqual(null);
  });

  test("PCP format with context", async () => {
    await emitMessage(socket, "wsContext", pcpMessageContext);
    await wait();
    const waitNotification1Promise = waitForEvent(socket, "notification1");
    const result = await emitEvent(socket, "sendNotificationWithContext", pcpMessageWithContext);
    expect(result).toBe(true);
    const waitResult1 = await waitNotification1Promise;
    expect(waitResult1).toEqual(pcpMessage1);
  });

  test("PCP fiori side effects", async () => {
    const waitSideEffect1Promise = waitForEvent(socket, "sideEffect1");
    const result = await emitEvent(socket, "triggerSideEffects", pcpTriggerSideEffects);
    expect(result).toBe(true);
    const waitResult1 = await waitSideEffect1Promise;
    expect(waitResult1).toEqual(pcpSideEffect1);
  });
});

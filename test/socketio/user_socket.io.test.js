"use strict";

const cds = require("@sap/cds");

cds.test(__dirname + "/../_env");

cds.env.websocket = {
  kind: "socket.io",
  impl: null,
};

const auth = require("../_env/util/auth");
const { wait } = require("../_env/util/common");
const {
  connect,
  disconnect,
  emitEvent,
  waitForEvent,
  waitForNoEvent,
  enterContext,
} = require("../_env/util/socket.io");

describe("User", () => {
  let socket;
  let socketOther;
  let socketOtherUser;

  beforeAll(async () => {
    socket = await connect("main");
    socketOther = await connect("main");
    socketOtherUser = await connect("main", {
      authorization: auth.carol,
    });
  });

  afterAll(async () => {
    await disconnect(socket);
    await disconnect(socketOther);
    await disconnect(socketOtherUser);
  });

  test("Event Context User Include - Static", async () => {
    const ID = "f67af09e-71bc-4293-80f9-cf1ed7fba973";
    await enterContext(socket, ID);
    await enterContext(socketOther, ID);
    await enterContext(socketOtherUser, ID);
    await wait();
    let eventResultPromise = waitForEvent(socket, "customContextUserIncludeEvent");
    let eventResultOtherPromise = waitForEvent(socketOther, "customContextUserIncludeEvent");
    let eventNoResultOtherUserPromise = waitForNoEvent(socketOtherUser, "customContextUserIncludeEvent");
    let result = await emitEvent(socket, "triggerCustomContextUserEvent", { ID, num: 1, text: "test" });
    expect(result).toBe("test1-alice");
    let eventResult = await eventResultPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    expect(eventResult.user).toBe("alice");
    eventResult = await eventResultOtherPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    expect(eventResult.user).toBe("alice");
    await eventNoResultOtherUserPromise;
  });

  test("Event Context User Include - Dynamic", async () => {
    const ID = "f67af09e-71bc-4293-80f9-cf1ed7fba973";
    await enterContext(socket, ID);
    await enterContext(socketOther, ID);
    await enterContext(socketOtherUser, ID);
    await wait();
    let eventResultPromise = waitForEvent(socket, "customContextUserIncludeDynamicEvent");
    let eventResultOtherPromise = waitForEvent(socketOther, "customContextUserIncludeDynamicEvent");
    let eventNoResultOtherUserPromise = waitForNoEvent(socketOtherUser, "customContextUserIncludeDynamicEvent");
    let result = await emitEvent(socket, "triggerCustomContextUserDynamicEvent", { ID, num: 1, text: "test" });
    expect(result).toBe("test1-alice");
    let eventResult = await eventResultPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    expect(eventResult.user).toBe("alice");
    eventResult = await eventResultOtherPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    expect(eventResult.user).toBe("alice");
    await eventNoResultOtherUserPromise;

    eventResultPromise = waitForEvent(socket, "customContextUserIncludeDynamicEvent");
    eventResultOtherPromise = waitForEvent(socketOther, "customContextUserIncludeDynamicEvent");
    let eventResultOtherUserPromise = waitForEvent(socketOtherUser, "customContextUserIncludeDynamicEvent");
    result = await emitEvent(socketOtherUser, "triggerCustomContextUserDynamicEvent", { ID, num: 1, text: "test" });
    expect(result).toBe("test1-carol");
    eventResult = await eventResultPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    expect(eventResult.user).toBe("carol");
    eventResult = await eventResultOtherPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    expect(eventResult.user).toBe("carol");
    eventResult = await eventResultOtherUserPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    expect(eventResult.user).toBe("carol");
  });

  test("Event Context User Exclude - Static", async () => {
    const ID = "f67af09e-71bc-4293-80f9-cf1ed7fba973";
    await enterContext(socket, ID);
    await enterContext(socketOther, ID);
    await enterContext(socketOtherUser, ID);
    await wait();
    let eventNoResultPromise = waitForNoEvent(socket, "customContextUserExcludeEvent");
    let eventNoResultOtherPromise = waitForNoEvent(socketOther, "customContextUserExcludeEvent");
    let eventResultOtherUserPromise = waitForEvent(socketOtherUser, "customContextUserExcludeEvent");
    let result = await emitEvent(socket, "triggerCustomContextUserEvent", { ID, num: 1, text: "test" });
    expect(result).toBe("test1-alice");
    await eventNoResultPromise;
    await eventNoResultOtherPromise;
    let eventResult = await eventResultOtherUserPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    expect(eventResult.user).toBe("alice");
  });

  test("Event Context User Exclude - Dynamic", async () => {
    const ID = "f67af09e-71bc-4293-80f9-cf1ed7fba973";
    await enterContext(socket, ID);
    await enterContext(socketOther, ID);
    await enterContext(socketOtherUser, ID);
    await wait();
    let eventNoResultPromise = waitForNoEvent(socket, "customContextUserExcludeDynamicEvent");
    let eventNoResultOtherPromise = waitForNoEvent(socketOther, "customContextUserExcludeDynamicEvent");
    let eventResultOtherUserPromise = waitForEvent(socketOtherUser, "customContextUserExcludeDynamicEvent");
    let result = await emitEvent(socket, "triggerCustomContextUserDynamicEvent", { ID, num: 1, text: "test" });
    expect(result).toBe("test1-alice");
    await eventNoResultPromise;
    await eventNoResultOtherPromise;
    let eventResult = await eventResultOtherUserPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    expect(eventResult.user).toBe("alice");

    let eventResultPromise = waitForEvent(socket, "customContextUserExcludeDynamicEvent");
    let eventResultOtherPromise = waitForEvent(socketOther, "customContextUserExcludeDynamicEvent");
    eventResultOtherUserPromise = waitForEvent(socketOtherUser, "customContextUserExcludeDynamicEvent");
    result = await emitEvent(socketOtherUser, "triggerCustomContextUserDynamicEvent", { ID, num: 1, text: "test" });
    expect(result).toBe("test1-carol");
    eventResult = await eventResultPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    expect(eventResult.user).toBe("carol");
    eventResult = await eventResultOtherPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    expect(eventResult.user).toBe("carol");
    eventResult = await eventResultOtherUserPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    expect(eventResult.user).toBe("carol");
  });

  test("Event Defined Users Include - Static", async () => {
    const ID = "f67af09e-71bc-4293-80f9-cf1ed7fba973";
    await enterContext(socket, ID);
    await enterContext(socketOther, ID);
    await enterContext(socketOtherUser, ID);
    await wait();
    let eventResultPromise = waitForEvent(socket, "customDefinedUserIncludeEvent");
    let eventResultOtherPromise = waitForEvent(socketOther, "customDefinedUserIncludeEvent");
    let eventNoResultOtherUserPromise = waitForNoEvent(socketOtherUser, "customDefinedUserIncludeEvent");
    let result = await emitEvent(socket, "triggerCustomDefinedUserEvent", { ID, num: 1, text: "test" });
    expect(result).toBe("test1-alice");
    let eventResult = await eventResultPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    expect(eventResult.user).toBe("alice");
    eventResult = await eventResultOtherPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    expect(eventResult.user).toBe("alice");
    await eventNoResultOtherUserPromise;
  });

  test("Event Defined Users Include - Dynamic", async () => {
    const ID = "f67af09e-71bc-4293-80f9-cf1ed7fba973";
    await enterContext(socket, ID);
    await enterContext(socketOther, ID);
    await enterContext(socketOtherUser, ID);
    await wait();
    let eventResultPromise = waitForEvent(socket, "customDefinedUserIncludeDynamicEvent");
    let eventResultOtherPromise = waitForEvent(socketOther, "customDefinedUserIncludeDynamicEvent");
    let eventNoResultOtherUserPromise = waitForNoEvent(socketOtherUser, "customDefinedUserIncludeDynamicEvent");
    let result = await emitEvent(socket, "triggerCustomDefinedUserDynamicEvent", { ID, num: 1, text: "test" });
    expect(result).toBe("test1-alice");
    let eventResult = await eventResultPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    expect(eventResult.user).toBe("alice");
    eventResult = await eventResultOtherPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    expect(eventResult.user).toBe("alice");
    await eventNoResultOtherUserPromise;

    eventResultPromise = waitForEvent(socket, "customDefinedUserIncludeDynamicEvent");
    eventResultOtherPromise = waitForEvent(socketOther, "customDefinedUserIncludeDynamicEvent");
    let eventResultOtherUserPromise = waitForEvent(socketOtherUser, "customDefinedUserIncludeDynamicEvent");
    result = await emitEvent(socketOtherUser, "triggerCustomDefinedUserDynamicEvent", { ID, num: 1, text: "test" });
    expect(result).toBe("test1-carol");
    eventResult = await eventResultPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    expect(eventResult.user).toBe("carol");
    eventResult = await eventResultOtherPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    expect(eventResult.user).toBe("carol");
    eventResult = await eventResultOtherUserPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    expect(eventResult.user).toBe("carol");
  });

  test("Event Defined Users Exclude - Static", async () => {
    const ID = "f67af09e-71bc-4293-80f9-cf1ed7fba973";
    await enterContext(socket, ID);
    await enterContext(socketOther, ID);
    await enterContext(socketOtherUser, ID);
    await wait();
    let eventNoResultPromise = waitForNoEvent(socket, "customDefinedUserExcludeEvent");
    let eventNoResultOtherPromise = waitForNoEvent(socketOther, "customDefinedUserExcludeEvent");
    let eventResultOtherUserPromise = waitForEvent(socketOtherUser, "customDefinedUserExcludeEvent");
    let result = await emitEvent(socket, "triggerCustomDefinedUserEvent", { ID, num: 1, text: "test" });
    expect(result).toBe("test1-alice");
    await eventNoResultPromise;
    await eventNoResultOtherPromise;
    let eventResult = await eventResultOtherUserPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    expect(eventResult.user).toBe("alice");
  });

  test("Event Defined Users Exclude - Dynamic", async () => {
    const ID = "f67af09e-71bc-4293-80f9-cf1ed7fba973";
    await enterContext(socket, ID);
    await enterContext(socketOther, ID);
    await enterContext(socketOtherUser, ID);
    await wait();
    let eventNoResultPromise = waitForNoEvent(socket, "customDefinedUserExcludeDynamicEvent");
    let eventNoResultOtherPromise = waitForNoEvent(socketOther, "customDefinedUserExcludeDynamicEvent");
    let eventResultOtherUserPromise = waitForEvent(socketOtherUser, "customDefinedUserExcludeDynamicEvent");
    let result = await emitEvent(socket, "triggerCustomDefinedUserDynamicEvent", { ID, num: 1, text: "test" });
    expect(result).toBe("test1-alice");
    await eventNoResultPromise;
    await eventNoResultOtherPromise;
    let eventResult = await eventResultOtherUserPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    expect(eventResult.user).toBe("alice");

    let eventResultPromise = waitForEvent(socket, "customDefinedUserExcludeDynamicEvent");
    let eventResultOtherPromise = waitForEvent(socketOther, "customDefinedUserExcludeDynamicEvent");
    const eventNoResultOtherUserPromise = waitForNoEvent(socketOtherUser, "customDefinedUserExcludeDynamicEvent");
    result = await emitEvent(socketOtherUser, "triggerCustomDefinedUserDynamicEvent", { ID, num: 1, text: "test" });
    expect(result).toBe("test1-carol");
    eventResult = await eventResultPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    expect(eventResult.user).toBe("carol");
    eventResult = await eventResultOtherPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    expect(eventResult.user).toBe("carol");
    await eventNoResultOtherUserPromise;
  });
});

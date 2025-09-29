"use strict";

const cds = require("@sap/cds");

cds.test(__dirname + "/../_env");

const auth = require("../_env/util/auth");
const { wait } = require("../_env/util/common");

const {
  connect,
  disconnect,
  emitEvent,
  waitForEvent,
  waitForNoEvent,
  enterContext,
  exitContext,
} = require("../_env/util/ws");

const ID = "f67af09e-71bc-4293-80f9-cf1ed7fba973";
const ID2 = "e67af09e-71bc-4293-80f9-cf1ed7fba973";

cds.env.websocket.operator = {
  include: "and",
  exclude: "and",
};

describe("User", () => {
  let socket;
  let socketOther;
  let socketOtherUser;

  beforeAll(async () => {
    socket = await connect("/ws/main");
    socketOther = await connect("/ws/main");
    socketOtherUser = await connect("/ws/main", {
      authorization: auth.carol,
    });
  });

  afterAll(async () => {
    await disconnect(socket);
    await disconnect(socketOther);
    await disconnect(socketOtherUser);
  });

  beforeEach(async () => {
    await exitContext(socket, [ID, ID2]);
    await exitContext(socketOther, [ID, ID2]);
    await exitContext(socketOtherUser, [ID, ID2]);
    await wait();
  });

  test("Event Context Filter Operator 'and' include", async () => {
    await enterContext(socket, ID);
    await enterContext(socketOther, ID);
    await enterContext(socketOtherUser, ID2);
    await wait();
    let eventResultPromise = waitForEvent(socket, "customContextUserIncludeEvent");
    let eventResultOtherPromise = waitForEvent(socketOther, "customContextUserIncludeEvent");
    let eventNoResultOtherUserPromise = waitForNoEvent(socketOtherUser, "customContextUserIncludeEvent");
    let result = await emitEvent(socket, "triggerCustomContextUserEvent", { ID, num: 1, text: "test" });
    expect(result).toBeNull();
    let eventResult = await eventResultPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    expect(eventResult.user).toBe("alice");
    eventResult = await eventResultOtherPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    expect(eventResult.user).toBe("alice");
    await eventNoResultOtherUserPromise;

    await exitContext(socketOther, ID);
    await wait();
    eventResultPromise = waitForEvent(socket, "customContextUserIncludeEvent");
    let eventNoResultOtherPromise = waitForNoEvent(socketOther, "customContextUserIncludeEvent");
    eventNoResultOtherUserPromise = waitForNoEvent(socketOtherUser, "customContextUserIncludeEvent");
    result = await emitEvent(socket, "triggerCustomContextUserEvent", { ID, num: 1, text: "test" });
    expect(result).toBeNull();
    eventResult = await eventResultPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    expect(eventResult.user).toBe("alice");
    await eventNoResultOtherPromise;
    await eventNoResultOtherUserPromise;
  });

  test("Event Context Filter Operator 'and' exclude", async () => {
    await enterContext(socket, ID);
    await enterContext(socketOther, ID);
    await enterContext(socketOtherUser, ID2);
    await wait();
    let eventNoResultPromise = waitForNoEvent(socket, "customContextUserExcludeAllEvent");
    let eventNoResultOtherPromise = waitForNoEvent(socketOther, "customContextUserExcludeAllEvent");
    let eventResultOtherUserPromise = waitForEvent(socketOtherUser, "customContextUserExcludeAllEvent");
    let result = await emitEvent(socket, "triggerCustomContextUserEvent", { ID, num: 1, text: "test" });
    expect(result).toBeNull();
    await eventNoResultPromise;
    await eventNoResultOtherPromise;
    let eventResult = await eventResultOtherUserPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    expect(eventResult.user).toBe("alice");

    await exitContext(socket, ID);
    await exitContext(socketOther, ID);
    await enterContext(socketOtherUser, ID);
    await wait();
    let eventResultPromise = waitForEvent(socket, "customContextUserExcludeAllEvent");
    let eventResultOtherPromise = waitForEvent(socketOther, "customContextUserExcludeAllEvent");
    eventResultOtherUserPromise = waitForEvent(socketOtherUser, "customContextUserExcludeAllEvent");
    result = await emitEvent(socket, "triggerCustomContextUserEvent", { ID, num: 1, text: "test" });
    expect(result).toBeNull();
    eventResult = await eventResultPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    expect(eventResult.user).toBe("alice");
    eventResult = await eventResultOtherPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    expect(eventResult.user).toBe("alice");
    eventResult = await eventResultOtherUserPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    expect(eventResult.user).toBe("alice");
  });
});

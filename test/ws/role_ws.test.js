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

describe("Role", () => {
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

  test("Event Role Include - Static", async () => {
    await enterContext(socket, ID);
    await enterContext(socketOther, ID);
    await enterContext(socketOtherUser, ID2);
    await wait();
    let eventResultPromise = waitForEvent(socket, "customRoleIncludeEvent");
    let eventResultOtherPromise = waitForEvent(socketOther, "customRoleIncludeEvent");
    let eventNoResultOtherUserPromise = waitForNoEvent(socketOtherUser, "customRoleIncludeEvent");
    let result = await emitEvent(socket, "triggerCustomRoleEvent", { ID, num: 1, text: "test" });
    expect(result).toBeNull();
    let eventResult = await eventResultPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    expect(eventResult.user).toBe("alice");
    expect(eventResult.role).toBe("admin");
    eventResult = await eventResultOtherPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    expect(eventResult.user).toBe("alice");
    expect(eventResult.role).toBe("admin");
    await eventNoResultOtherUserPromise;
  });

  test("Event Role Include - Dynamic", async () => {
    await enterContext(socket, ID);
    await enterContext(socketOther, ID);
    await enterContext(socketOtherUser, ID2);
    await wait();
    let eventResultPromise = waitForEvent(socket, "customRoleIncludeDynamicEvent");
    let eventResultOtherPromise = waitForEvent(socketOther, "customRoleIncludeDynamicEvent");
    let eventNoResultOtherUserPromise = waitForNoEvent(socketOtherUser, "customRoleIncludeDynamicEvent");
    let result = await emitEvent(socket, "triggerCustomRoleDynamicEvent", { ID, num: 1, text: "test" });
    expect(result).toBeNull();
    let eventResult = await eventResultPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    expect(eventResult.user).toBe("alice");
    expect(eventResult.role).toBe("admin");
    eventResult = await eventResultOtherPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    expect(eventResult.user).toBe("alice");
    expect(eventResult.role).toBe("admin");
    await eventNoResultOtherUserPromise;

    await enterContext(socketOtherUser, ID);
    eventResultPromise = waitForEvent(socket, "customRoleIncludeDynamicEvent");
    eventResultOtherPromise = waitForEvent(socketOther, "customRoleIncludeDynamicEvent");
    let eventResultOtherUserPromise = waitForEvent(socketOtherUser, "customRoleIncludeDynamicEvent");
    result = await emitEvent(socketOtherUser, "triggerCustomRoleDynamicEvent", { ID, num: 1, text: "test" });
    expect(result).toBeNull();
    eventResult = await eventResultPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    expect(eventResult.user).toBe("carol");
    expect(eventResult.role).toBe("admin");
    eventResult = await eventResultOtherPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    expect(eventResult.user).toBe("carol");
    expect(eventResult.role).toBe("admin");
    eventResult = await eventResultOtherUserPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    expect(eventResult.user).toBe("carol");
    expect(eventResult.role).toBe("admin");
  });

  test("Event Role Exclude - Static", async () => {
    await enterContext(socket, ID2);
    await enterContext(socketOther, ID2);
    await enterContext(socketOtherUser, ID);
    await wait();
    let eventNoResultPromise = waitForNoEvent(socket, "customRoleExcludeEvent");
    let eventNoResultOtherPromise = waitForNoEvent(socketOther, "customRoleExcludeEvent");
    let eventResultOtherUserPromise = waitForEvent(socketOtherUser, "customRoleExcludeEvent");
    let result = await emitEvent(socket, "triggerCustomRoleEvent", { ID, num: 1, text: "test" });
    expect(result).toBeNull();
    await eventNoResultPromise;
    await eventNoResultOtherPromise;
    let eventResult = await eventResultOtherUserPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    expect(eventResult.user).toBe("alice");
    expect(eventResult.role).toBe("admin");
  });

  test("Event Role Exclude - Dynamic", async () => {
    await enterContext(socket, ID2);
    await enterContext(socketOther, ID2);
    await enterContext(socketOtherUser, ID);
    await wait();
    let eventNoResultPromise = waitForNoEvent(socket, "customRoleExcludeDynamicEvent");
    let eventNoResultOtherPromise = waitForNoEvent(socketOther, "customRoleExcludeDynamicEvent");
    let eventResultOtherUserPromise = waitForEvent(socketOtherUser, "customRoleExcludeDynamicEvent");
    let result = await emitEvent(socket, "triggerCustomRoleDynamicEvent", { ID, num: 1, text: "test" });
    expect(result).toBeNull();
    await eventNoResultPromise;
    await eventNoResultOtherPromise;
    let eventResult = await eventResultOtherUserPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    expect(eventResult.user).toBe("alice");
    expect(eventResult.role).toBe("abc");

    await enterContext(socket, ID);
    await enterContext(socketOther, ID);
    await exitContext(socketOtherUser, ID);
    await wait();
    let eventResultPromise = waitForEvent(socket, "customRoleExcludeDynamicEvent");
    let eventResultOtherPromise = waitForEvent(socketOther, "customRoleExcludeDynamicEvent");
    const eventNoResultOtherUserPromise = waitForNoEvent(socketOtherUser, "customRoleExcludeDynamicEvent");
    result = await emitEvent(socketOtherUser, "triggerCustomRoleDynamicEvent", { ID, num: 1, text: "test" });
    expect(result).toBeNull();
    eventResult = await eventResultPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    expect(eventResult.user).toBe("carol");
    expect(eventResult.role).toBe("abc");
    eventResult = await eventResultOtherPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    expect(eventResult.user).toBe("carol");
    expect(eventResult.role).toBe("abc");
    await eventNoResultOtherUserPromise;
  });
});

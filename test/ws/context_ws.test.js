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

describe("Context", () => {
  let socket;
  let socketOther;
  let socketOtherTenant;
  let socketOtherUser;

  beforeAll(async () => {
    socket = await connect("/ws/main");
    socketOther = await connect("/ws/main");
    socketOtherTenant = await connect("/ws/main", {
      authorization: auth.bob,
    });
    socketOtherUser = await connect("/ws/main", {
      authorization: auth.carol,
    });
  });

  afterAll(async () => {
    await disconnect(socket);
    await disconnect(socketOther);
    await disconnect(socketOtherTenant);
    await disconnect(socketOtherUser);
  });

  test("Event Context", async () => {
    const ID = "f67af09e-71bc-4293-80f9-cf1ed7fba973";

    await enterContext(socket, ID);
    await wait();
    let eventResultPromise = waitForEvent(socket, "customContextEvent");
    let eventNoResultPromise = waitForNoEvent(socketOther, "customContextEvent");
    let result = await emitEvent(socket, "triggerCustomContextEvent", { ID, num: 1, text: "test" });
    expect(result).toBeNull();
    let eventResult = await eventResultPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    await eventNoResultPromise;

    await enterContext(socketOther, ID);
    await wait();
    eventResultPromise = waitForEvent(socket, "customContextEvent");
    const eventResultOtherPromise = waitForEvent(socketOther, "customContextEvent");
    result = await emitEvent(socket, "triggerCustomContextEvent", { ID, num: 1, text: "test" });
    expect(result).toBeNull();
    eventResult = await eventResultPromise;
    expect(eventResult.text).toBe("test1");
    const eventResultOther = await eventResultOtherPromise;
    expect(eventResultOther.text).toBe("test1");

    await exitContext(socketOther, ID);
    await wait();
    eventResultPromise = waitForEvent(socket, "customContextEvent");
    eventNoResultPromise = waitForNoEvent(socketOther, "customContextEvent");
    result = await emitEvent(socket, "triggerCustomContextEvent", { ID, num: 1, text: "test" });
    expect(result).toBeNull();
    eventResult = await eventResultPromise;
    expect(eventResult.text).toBe("test1");
    await eventNoResultPromise;

    await exitContext(socket, ID);
    await exitContext(socketOther, ID);
    await wait();
    eventNoResultPromise = waitForNoEvent(socket, "customContextEvent");
    const eventNoOtherResultPromise = waitForNoEvent(socketOther, "customContextEvent");
    result = await emitEvent(socket, "triggerCustomContextEvent", { ID, num: 1, text: "test" });
    expect(result).toBeNull();
    await eventNoResultPromise;
    await eventNoOtherResultPromise;

    await enterContext(socket, ID);
  });

  test("Event Context Static", async () => {
    const context = "context";

    await enterContext(socket, context);
    await wait();
    let eventResultPromise = waitForEvent(socket, "customContextStaticEvent");
    let eventNoResultPromise = waitForNoEvent(socketOther, "customContextStaticEvent");
    let result = await emitEvent(socket, "triggerCustomContextStaticEvent", { num: 1, text: "test" });
    expect(result).toBeNull();
    let eventResult = await eventResultPromise;
    expect(eventResult.text).toBe("test1");
    await eventNoResultPromise;

    await enterContext(socketOther, context);
    await wait();
    eventResultPromise = waitForEvent(socket, "customContextStaticEvent");
    const eventResultOtherPromise = waitForEvent(socketOther, "customContextStaticEvent");
    result = await emitEvent(socket, "triggerCustomContextStaticEvent", { num: 1, text: "test" });
    expect(result).toBeNull();
    eventResult = await eventResultPromise;
    expect(eventResult.text).toBe("test1");
    const eventResultOther = await eventResultOtherPromise;
    expect(eventResultOther.text).toBe("test1");

    await exitContext(socketOther, context);
    await wait();
    eventResultPromise = waitForEvent(socket, "customContextStaticEvent");
    eventNoResultPromise = waitForNoEvent(socketOther, "customContextStaticEvent");
    result = await emitEvent(socket, "triggerCustomContextStaticEvent", { num: 1, text: "test" });
    expect(result).toBeNull();
    eventResult = await eventResultPromise;
    expect(eventResult.text).toBe("test1");
    await eventNoResultPromise;

    await exitContext(socket, context);
    await exitContext(socketOther, context);
    await wait();
    eventNoResultPromise = waitForNoEvent(socket, "customContextStaticEvent");
    const eventNoOtherResultPromise = waitForNoEvent(socketOther, "customContextStaticEvent");
    result = await emitEvent(socket, "triggerCustomContextStaticEvent", { num: 1, text: "test" });
    expect(result).toBeNull();
    await eventNoResultPromise;
    await eventNoOtherResultPromise;

    await enterContext(socket, context);
  });

  test("Event Context Mass", async () => {
    const ID1 = "f67af09e-71bc-4293-80f9-cf1ed7fba973";
    const ID2 = "e67af09e-71bc-4293-80f9-cf1ed7fba973";

    await enterContext(socket, ID1);
    await enterContext(socketOther, ID2);
    await wait();
    let eventResultPromise = waitForEvent(socket, "customContextMassEvent");
    let eventResultPromiseOther = waitForEvent(socketOther, "customContextMassEvent");
    let result = await emitEvent(socket, "triggerCustomContextMassEvent", { ID1, ID2, num: 1, text: "test" });
    expect(result).toBeNull();
    const eventResult = await eventResultPromise;
    expect(eventResult.text).toBe("test1");
    expect(eventResult.IDs).toEqual([ID1, ID2]);
    const eventResultOther = await eventResultPromiseOther;
    expect(eventResultOther.text).toBe("test1");
    expect(eventResultOther.IDs).toEqual([ID1, ID2]);

    await exitContext(socket, ID1);
    await exitContext(socketOther, ID2);
    await wait();
    const eventNoResultPromise = waitForNoEvent(socket, "customContextMassEvent");
    const eventNoOtherResultPromise = waitForNoEvent(socketOther, "customContextMassEvent");
    result = await emitEvent(socket, "triggerCustomContextMassEvent", { ID1, ID2, num: 1, text: "test" });
    expect(result).toBeNull();
    await eventNoResultPromise;
    await eventNoOtherResultPromise;

    await enterContext(socket, ID1);
    await enterContext(socketOther, ID2);
  });

  test("Event Context Header", async () => {
    const ID = "f67af09e-71bc-4293-80f9-cf1ed7fba973";
    await enterContext(socket, ID);
    await enterContext(socketOtherUser, ID);
    await wait();
    let eventNoResultPromise = waitForNoEvent(socket, "customContextHeaderEvent");
    let eventResultOtherUserPromise = waitForEvent(socketOtherUser, "customContextHeaderEvent");
    let result = await emitEvent(socket, "triggerCustomContextHeaderEvent", { ID, num: 1, text: "test" });
    expect(result).toBeNull();
    await eventNoResultPromise;
    let eventResult = await eventResultOtherUserPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");

    let eventResultPromise = waitForEvent(socket, "customContextHeaderEvent");
    eventResultOtherUserPromise = waitForEvent(socketOtherUser, "customContextHeaderEvent");
    result = await emitEvent(socket, "triggerCustomContextHeaderEvent", { ID, num: 2, text: "test" });
    expect(result).toBeNull();
    eventResult = await eventResultPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test2");
    eventResult = await eventResultOtherUserPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test2");

    await exitContext(socketOtherUser, ID);
    await wait();
    eventResultPromise = waitForEvent(socket, "customContextHeaderEvent");
    const eventNoResultOtherUserPromise = waitForNoEvent(socketOtherUser, "customContextHeaderEvent");
    result = await emitEvent(socket, "triggerCustomContextHeaderEvent", { ID, num: 2, text: "test" });
    expect(result).toBeNull();
    eventResult = await eventResultPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test2");
    await eventNoResultOtherUserPromise;
  });
});

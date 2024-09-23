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
  exitContext,
} = require("../_env/util/socket.io");

describe("Context", () => {
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

  test("Event Context Include", async () => {
    const ID = "f67af09e-71bc-4293-80f9-cf1ed7fba973";

    await enterContext(socket, ID);
    await wait();
    let eventResultPromise = waitForEvent(socket, "customContextIncludeEvent");
    let eventNoResultPromise = waitForNoEvent(socketOther, "customContextIncludeEvent");
    let result = await emitEvent(socket, "triggerCustomContextEvent", { ID, num: 1, text: "test" });
    expect(result).toBe("test1");
    let eventResult = await eventResultPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    await eventNoResultPromise;

    await enterContext(socketOther, ID);
    await wait();
    eventResultPromise = waitForEvent(socket, "customContextIncludeEvent");
    const eventResultOtherPromise = waitForEvent(socketOther, "customContextIncludeEvent");
    result = await emitEvent(socket, "triggerCustomContextEvent", { ID, num: 1, text: "test" });
    expect(result).toBe("test1");
    eventResult = await eventResultPromise;
    expect(eventResult.text).toBe("test1");
    const eventResultOther = await eventResultOtherPromise;
    expect(eventResultOther.text).toBe("test1");

    await exitContext(socketOther, ID);
    await wait();
    eventResultPromise = waitForEvent(socket, "customContextIncludeEvent");
    eventNoResultPromise = waitForNoEvent(socketOther, "customContextIncludeEvent");
    result = await emitEvent(socket, "triggerCustomContextEvent", { ID, num: 1, text: "test" });
    expect(result).toBe("test1");
    eventResult = await eventResultPromise;
    expect(eventResult.text).toBe("test1");
    await eventNoResultPromise;

    await exitContext(socket, ID);
    await exitContext(socketOther, ID);
    await wait();
    eventNoResultPromise = waitForNoEvent(socket, "customContextIncludeEvent");
    const eventNoOtherResultPromise = waitForNoEvent(socketOther, "customContextIncludeEvent");
    result = await emitEvent(socket, "triggerCustomContextEvent", { ID, num: 1, text: "test" });
    expect(result).toBe("test1");
    await eventNoResultPromise;
    await eventNoOtherResultPromise;

    await enterContext(socket, ID);
  });

  test("Event Context Include - Static", async () => {
    const context = "context";

    await enterContext(socket, context);
    await wait();
    let eventResultPromise = waitForEvent(socket, "customContextIncludeStaticEvent");
    let eventNoResultPromise = waitForNoEvent(socketOther, "customContextIncludeStaticEvent");
    let result = await emitEvent(socket, "triggerCustomContextStaticEvent", { num: 1, text: "test" });
    expect(result).toBe("test1");
    let eventResult = await eventResultPromise;
    expect(eventResult.text).toBe("test1");
    await eventNoResultPromise;

    await enterContext(socketOther, context);
    await wait();
    eventResultPromise = waitForEvent(socket, "customContextIncludeStaticEvent");
    const eventResultOtherPromise = waitForEvent(socketOther, "customContextIncludeStaticEvent");
    result = await emitEvent(socket, "triggerCustomContextStaticEvent", { num: 1, text: "test" });
    expect(result).toBe("test1");
    eventResult = await eventResultPromise;
    expect(eventResult.text).toBe("test1");
    const eventResultOther = await eventResultOtherPromise;
    expect(eventResultOther.text).toBe("test1");

    await exitContext(socketOther, context);
    await wait();
    eventResultPromise = waitForEvent(socket, "customContextIncludeStaticEvent");
    eventNoResultPromise = waitForNoEvent(socketOther, "customContextIncludeStaticEvent");
    result = await emitEvent(socket, "triggerCustomContextStaticEvent", { num: 1, text: "test" });
    expect(result).toBe("test1");
    eventResult = await eventResultPromise;
    expect(eventResult.text).toBe("test1");
    await eventNoResultPromise;

    await exitContext(socket, context);
    await exitContext(socketOther, context);
    await wait();
    eventNoResultPromise = waitForNoEvent(socket, "customContextIncludeStaticEvent");
    const eventNoOtherResultPromise = waitForNoEvent(socketOther, "customContextIncludeStaticEvent");
    result = await emitEvent(socket, "triggerCustomContextStaticEvent", { num: 1, text: "test" });
    expect(result).toBe("test1");
    await eventNoResultPromise;
    await eventNoOtherResultPromise;

    await enterContext(socket, context);
  });

  test("Event Context Include - Mass", async () => {
    const ID1 = "f67af09e-71bc-4293-80f9-cf1ed7fba973";
    const ID2 = "e67af09e-71bc-4293-80f9-cf1ed7fba973";

    await enterContext(socket, ID1);
    await enterContext(socketOther, ID2);
    await wait();
    let eventResultPromise = waitForEvent(socket, "customContextIncludeMassEvent");
    let eventResultPromiseOther = waitForEvent(socketOther, "customContextIncludeMassEvent");
    let result = await emitEvent(socket, "triggerCustomContextMassEvent", { ID1, ID2, num: 1, text: "test" });
    expect(result).toBe("test1");
    const eventResult = await eventResultPromise;
    expect(eventResult.text).toBe("test1");
    expect(eventResult.IDs).toEqual([ID1, ID2]);
    const eventResultOther = await eventResultPromiseOther;
    expect(eventResultOther.text).toBe("test1");
    expect(eventResultOther.IDs).toEqual([ID1, ID2]);

    await exitContext(socket, ID1);
    await exitContext(socketOther, ID2);
    await wait();
    const eventNoResultPromise = waitForNoEvent(socket, "customContextIncludeMassEvent");
    const eventNoOtherResultPromise = waitForNoEvent(socketOther, "customContextIncludeMassEvent");
    result = await emitEvent(socket, "triggerCustomContextMassEvent", { ID1, ID2, num: 1, text: "test" });
    expect(result).toBe("test1");
    await eventNoResultPromise;
    await eventNoOtherResultPromise;

    await enterContext(socket, ID1);
    await enterContext(socketOther, ID2);
  });

  test("Event Context Exclude", async () => {
    const ID = "f67af09e-71bc-4293-80f9-cf1ed7fba973";

    await enterContext(socket, ID);
    await wait();
    let eventNoResultPromise = waitForNoEvent(socket, "customContextExcludeEvent");
    let eventResultPromise = waitForEvent(socketOther, "customContextExcludeEvent");
    let result = await emitEvent(socket, "triggerCustomContextEvent", { ID, num: 1, text: "test" });
    expect(result).toBe("test1");
    await eventNoResultPromise;
    let eventResult = await eventResultPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");

    await enterContext(socketOther, ID);
    await wait();
    eventNoResultPromise = waitForNoEvent(socket, "customContextExcludeEvent");
    const eventNoResultOtherPromise = waitForNoEvent(socketOther, "customContextExcludeEvent");
    result = await emitEvent(socket, "triggerCustomContextEvent", { ID, num: 1, text: "test" });
    expect(result).toBe("test1");
    await eventNoResultPromise;
    await eventNoResultOtherPromise;

    await exitContext(socketOther, ID);
    await wait();
    eventNoResultPromise = waitForNoEvent(socket, "customContextExcludeEvent");
    eventResultPromise = waitForEvent(socketOther, "customContextExcludeEvent");
    result = await emitEvent(socket, "triggerCustomContextEvent", { ID, num: 1, text: "test" });
    expect(result).toBe("test1");
    await eventNoResultPromise;
    eventResult = await eventResultPromise;
    expect(eventResult.text).toBe("test1");

    await exitContext(socket, ID);
    await exitContext(socketOther, ID);
    await wait();
    eventResultPromise = waitForEvent(socket, "customContextExcludeEvent");
    const eventOtherResultPromise = waitForEvent(socketOther, "customContextExcludeEvent");
    result = await emitEvent(socket, "triggerCustomContextEvent", { ID, num: 1, text: "test" });
    expect(result).toBe("test1");
    eventResult = await eventResultPromise;
    expect(eventResult.text).toBe("test1");
    const eventOtherResult = await eventOtherResultPromise;
    expect(eventOtherResult.text).toBe("test1");

    await enterContext(socket, ID);
  });

  test("Event Context Exclude - Static", async () => {
    const context = "context";

    await enterContext(socket, context);
    await wait();
    let eventNoResultPromise = waitForNoEvent(socket, "customContextExcludeStaticEvent");
    let eventResultPromise = waitForEvent(socketOther, "customContextExcludeStaticEvent");
    let result = await emitEvent(socket, "triggerCustomContextStaticEvent", { num: 1, text: "test" });
    expect(result).toBe("test1");
    await eventNoResultPromise;
    let eventResult = await eventResultPromise;
    expect(eventResult.text).toBe("test1");

    await enterContext(socketOther, context);
    await wait();
    eventNoResultPromise = waitForNoEvent(socket, "customContextExcludeStaticEvent");
    const eventNoResultOtherPromise = waitForNoEvent(socketOther, "customContextExcludeStaticEvent");
    result = await emitEvent(socket, "triggerCustomContextStaticEvent", { num: 1, text: "test" });
    expect(result).toBe("test1");
    await eventNoResultPromise;
    await eventNoResultOtherPromise;

    await exitContext(socketOther, context);
    await wait();
    eventNoResultPromise = waitForNoEvent(socket, "customContextExcludeStaticEvent");
    eventResultPromise = waitForEvent(socketOther, "customContextExcludeStaticEvent");
    result = await emitEvent(socket, "triggerCustomContextStaticEvent", { num: 1, text: "test" });
    expect(result).toBe("test1");
    await eventNoResultPromise;
    eventResult = await eventResultPromise;
    expect(eventResult.text).toBe("test1");

    await exitContext(socket, context);
    await exitContext(socketOther, context);
    await wait();
    eventResultPromise = waitForEvent(socket, "customContextExcludeStaticEvent");
    const eventOtherResultPromise = waitForEvent(socketOther, "customContextExcludeStaticEvent");
    result = await emitEvent(socket, "triggerCustomContextStaticEvent", { num: 1, text: "test" });
    expect(result).toBe("test1");
    eventResult = await eventResultPromise;
    expect(eventResult.text).toBe("test1");
    const eventOtherResult = await eventOtherResultPromise;
    expect(eventOtherResult.text).toBe("test1");

    await enterContext(socket, context);
  });

  test("Event Context Exclude - Mass", async () => {
    const ID1 = "f67af09e-71bc-4293-80f9-cf1ed7fba973";
    const ID2 = "e67af09e-71bc-4293-80f9-cf1ed7fba973";

    await enterContext(socket, ID1);
    await enterContext(socketOther, ID2);
    await wait();
    let eventNoResultPromise = waitForNoEvent(socket, "customContextExcludeMassEvent");
    let eventNoResultPromiseOther = waitForNoEvent(socketOther, "customContextExcludeMassEvent");
    let result = await emitEvent(socket, "triggerCustomContextMassEvent", { ID1, ID2, num: 1, text: "test" });
    expect(result).toBe("test1");
    await eventNoResultPromise;
    await eventNoResultPromiseOther;

    await exitContext(socket, ID1);
    await exitContext(socketOther, ID2);
    await wait();
    const eventResultPromise = waitForEvent(socket, "customContextExcludeMassEvent");
    const eventOtherResultPromise = waitForEvent(socketOther, "customContextExcludeMassEvent");
    result = await emitEvent(socket, "triggerCustomContextMassEvent", { ID1, ID2, num: 1, text: "test" });
    expect(result).toBe("test1");
    const eventResult = await eventResultPromise;
    expect(eventResult.text).toBe("test1");
    expect(eventResult.IDs).toEqual([ID1, ID2]);
    const eventResultOther = await eventOtherResultPromise;
    expect(eventResultOther.text).toBe("test1");
    expect(eventResultOther.IDs).toEqual([ID1, ID2]);

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
    expect(result).toBe("test1-alice");
    await eventNoResultPromise;
    let eventResult = await eventResultOtherUserPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");

    let eventResultPromise = waitForEvent(socket, "customContextHeaderEvent");
    eventResultOtherUserPromise = waitForEvent(socketOtherUser, "customContextHeaderEvent");
    result = await emitEvent(socket, "triggerCustomContextHeaderEvent", { ID, num: 2, text: "test" });
    expect(result).toBe("test2-alice");
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
    expect(result).toBe("test2-alice");
    eventResult = await eventResultPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test2");
    await eventNoResultOtherUserPromise;
  });
});

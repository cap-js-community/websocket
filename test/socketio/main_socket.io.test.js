"use strict";

const cds = require("@sap/cds");

cds.test(__dirname + "/../_env");

cds.env.websocket = {
  kind: "socket.io",
  impl: null,
};

const auth = require("../_env/util/auth");
const { cleanData, wait } = require("../_env/util/common");
const {
  connect,
  disconnect,
  emitEvent,
  waitForEvent,
  waitForNoEvent,
  enterContext,
  exitContext,
} = require("../_env/util/socket.io");

describe("Main", () => {
  let socket;
  let socketOther;
  let socketOtherTenant;
  let socketOtherUser;

  beforeAll(async () => {
    socket = await connect("main");
    socketOther = await connect("main");
    socketOtherTenant = await connect("main", {
      authorization: auth.bob,
    });
    socketOtherUser = await connect("main", {
      authorization: auth.carol,
    });
  });

  afterAll(async () => {
    await disconnect(socket);
    await disconnect(socketOther);
    await disconnect(socketOtherTenant);
    await disconnect(socketOtherUser);
  });

  test("Unbound function", async () => {
    const result = await emitEvent(socket, "unboundFunction", { num: 1, text: "test" });
    expect(result).toBe("test1");
  });

  test("Unbound action", async () => {
    const result = await emitEvent(socket, "unboundAction", { num: 2, text: "test" });
    expect(result).toBe("test2");
  });

  test("CRUD entity", async () => {
    let header = {
      name: "Test",
      description: "Test description",
      country: "de",
      currency: "EUR",
      stock: 11,
      price: 44.44,
      Items: [
        {
          name: "Test-Item-1",
          description: "Test Item description",
          startAt: new Date("2024-01-01T12:00:00.000Z").toISOString(),
          endAt: new Date("2024-12-31T12:00:00.000Z").toISOString(),
        },
      ],
    };
    const createdResultPromise = waitForEvent(socketOther, "Header:created");
    const createResult = await emitEvent(socket, "Header:create", header);
    expect(cleanData(createResult)).toMatchSnapshot();
    const ID = createResult.ID;
    const createdResult = await createdResultPromise;
    expect(cleanData(createdResult)).toMatchSnapshot();
    expect(createdResult.ID).toEqual(ID);

    const readResult = await emitEvent(socket, "Header:read", { ID });
    expect(cleanData(readResult)).toMatchSnapshot();

    const readDeepResult = await emitEvent(socket, "Header:readDeep", { ID });
    expect(cleanData(readDeepResult)).toMatchSnapshot();

    header = readDeepResult;
    header.description += " - updated";
    header.Items[0].description += " - updated";
    const updatedResultPromise = waitForEvent(socketOther, "Header:updated");
    const updateResult = await emitEvent(socket, "Header:update", header);
    expect(cleanData(updateResult)).toMatchSnapshot();
    const updatedResult = await updatedResultPromise;
    expect(cleanData(updatedResult)).toMatchSnapshot();
    expect(updatedResult.ID).toEqual(ID);

    const deletedResultPromise = waitForEvent(socketOther, "Header:deleted");
    const deleteResult = await emitEvent(socket, "Header:delete", { ID });
    expect(cleanData(deleteResult)).toMatchSnapshot();
    const deletedResult = await deletedResultPromise;
    expect(cleanData(deletedResult)).toMatchSnapshot();
    expect(deletedResult.ID).toEqual(ID);

    const listResult = await emitEvent(socket, "Header:list");
    expect(cleanData(listResult)).toMatchSnapshot();
  });

  test("Bound function", async () => {
    const result = await emitEvent(socket, "Header:boundFunction", { num: 1, text: "test" });
    expect(result).toBe("test1");
  });

  test("Bound action", async () => {
    const result = await emitEvent(socket, "Header:boundAction", { num: 2, text: "test" });
    expect(result).toBe("test2");
  });

  test("Event Exception", async () => {
    try {
      await emitEvent(socket, "eventException", {});
    } catch (err) {
      expect(err.message).toEqual("An error occurred");
    }
  });

  test("Event", async () => {
    const eventResultPromise = waitForEvent(socketOther, "customEvent");
    const result = await emitEvent(socket, "triggerCustomEvent", { num: 1, text: "test" });
    expect(result).toBe("test1");
    const eventResult = await eventResultPromise;
    expect(eventResult.text).toBe("test1");
  });

  test("Event Tenant", async () => {
    const eventResultPromise = waitForEvent(socketOther, "customEvent");
    const eventNoResultPromise = waitForNoEvent(socketOtherTenant, "customEvent");
    const result = await emitEvent(socket, "triggerCustomEvent", { num: 1, text: "test" });
    expect(result).toBe("test1");
    const eventResult = await eventResultPromise;
    expect(eventResult.text).toBe("test1");
    await eventNoResultPromise;
  });

  test("Event Context", async () => {
    const ID = "f67af09e-71bc-4293-80f9-cf1ed7fba973";

    await enterContext(socket, ID);
    await wait();
    let eventResultPromise = waitForEvent(socket, "customContextEvent");
    let eventNoResultPromise = waitForNoEvent(socketOther, "customContextEvent");
    let result = await emitEvent(socket, "triggerCustomContextEvent", { ID, num: 1, text: "test" });
    expect(result).toBe("test1");
    let eventResult = await eventResultPromise;
    expect(eventResult.ID).toBe(ID);
    expect(eventResult.text).toBe("test1");
    await eventNoResultPromise;

    await enterContext(socketOther, ID);
    await wait();
    eventResultPromise = waitForEvent(socket, "customContextEvent");
    const eventResultOtherPromise = waitForEvent(socketOther, "customContextEvent");
    result = await emitEvent(socket, "triggerCustomContextEvent", { ID, num: 1, text: "test" });
    expect(result).toBe("test1");
    eventResult = await eventResultPromise;
    expect(eventResult.text).toBe("test1");
    const eventResultOther = await eventResultOtherPromise;
    expect(eventResultOther.text).toBe("test1");

    await exitContext(socketOther, ID);
    await wait();
    eventResultPromise = waitForEvent(socket, "customContextEvent");
    eventNoResultPromise = waitForNoEvent(socketOther, "customContextEvent");
    result = await emitEvent(socket, "triggerCustomContextEvent", { ID, num: 1, text: "test" });
    expect(result).toBe("test1");
    eventResult = await eventResultPromise;
    expect(eventResult.text).toBe("test1");
    await eventNoResultPromise;

    await exitContext(socket, ID);
    await exitContext(socketOther, ID);
    await wait();
    eventNoResultPromise = waitForNoEvent(socket, "customContextEvent");
    const eventNoOtherResultPromise = waitForNoEvent(socketOther, "customContextEvent");
    result = await emitEvent(socket, "triggerCustomContextEvent", { ID, num: 1, text: "test" });
    expect(result).toBe("test1");
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
    expect(result).toBe("test1");
    let eventResult = await eventResultPromise;
    expect(eventResult.text).toBe("test1");
    await eventNoResultPromise;

    await enterContext(socketOther, context);
    await wait();
    eventResultPromise = waitForEvent(socket, "customContextStaticEvent");
    const eventResultOtherPromise = waitForEvent(socketOther, "customContextStaticEvent");
    result = await emitEvent(socket, "triggerCustomContextStaticEvent", { num: 1, text: "test" });
    expect(result).toBe("test1");
    eventResult = await eventResultPromise;
    expect(eventResult.text).toBe("test1");
    const eventResultOther = await eventResultOtherPromise;
    expect(eventResultOther.text).toBe("test1");

    await exitContext(socketOther, context);
    await wait();
    eventResultPromise = waitForEvent(socket, "customContextStaticEvent");
    eventNoResultPromise = waitForNoEvent(socketOther, "customContextStaticEvent");
    result = await emitEvent(socket, "triggerCustomContextStaticEvent", { num: 1, text: "test" });
    expect(result).toBe("test1");
    eventResult = await eventResultPromise;
    expect(eventResult.text).toBe("test1");
    await eventNoResultPromise;

    await exitContext(socket, context);
    await exitContext(socketOther, context);
    await wait();
    eventNoResultPromise = waitForNoEvent(socket, "customContextStaticEvent");
    const eventNoOtherResultPromise = waitForNoEvent(socketOther, "customContextStaticEvent");
    result = await emitEvent(socket, "triggerCustomContextStaticEvent", { num: 1, text: "test" });
    expect(result).toBe("test1");
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
    const eventNoResultPromise = waitForNoEvent(socket, "customContextMassEvent");
    const eventNoOtherResultPromise = waitForNoEvent(socketOther, "customContextMassEvent");
    result = await emitEvent(socket, "triggerCustomContextMassEvent", { ID1, ID2, num: 1, text: "test" });
    expect(result).toBe("test1");
    await eventNoResultPromise;
    await eventNoOtherResultPromise;

    await enterContext(socket, ID1);
    await enterContext(socketOther, ID2);
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

  test("Disconnects socket (last test)", async () => {
    await disconnect(socket); // for test coverage
    await wait();
    expect(socket).toBeDefined();
  });
});

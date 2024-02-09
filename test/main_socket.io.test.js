"use strict";

const cds = require("@sap/cds");

cds.test(__dirname + "/_env");

cds.env.websocket = {
  kind: "socket.io",
};

const auth = require("./_env/util/auth");
const { cleanData, wait } = require("./_env/util/common");
const {
  connect,
  disconnect,
  emitEvent,
  waitForEvent,
  waitForNoEvent,
  enterContext,
  exitContext,
} = require("./_env/util/socket.io");

describe("Chat", () => {
  let socket;
  let socketOther;
  let socketOtherTenant;

  beforeAll(async () => {
    socket = await connect("main");
    socketOther = await connect("main");
    socketOtherTenant = await connect("main", {
      authorization: auth.bob,
    });
  });

  afterAll(async () => {
    await disconnect(socket);
    await disconnect(socketOther);
    await disconnect(socketOtherTenant);
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

  test("Disconnects socket (last test)", async () => {
    await disconnect(socket); // for test coverage
    await wait();
  });
});

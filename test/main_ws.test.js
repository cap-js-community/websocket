"use strict";

const cds = require("@sap/cds");

cds.test(__dirname + "/_env");

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
} = require("./_env/util/ws");

describe("Chat", () => {
  let socket;
  let socketOther;
  let socketOtherTenant;

  beforeAll(async () => {
    socket = await connect("/ws/main");
    socketOther = await connect("/ws/main");
    socketOtherTenant = await connect("/ws/main", {
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
    expect(result).toBeNull();
  });

  test("Unbound action", async () => {
    const result = await emitEvent(socket, "unboundAction", { num: 2, text: "test" });
    expect(result).toBeNull();
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
    expect(createResult).toBeNull();
    const createdResult = await createdResultPromise;
    expect(cleanData(createdResult)).toMatchSnapshot();
    const ID = createdResult.ID;
    expect(createdResult.ID).toEqual(ID);

    const readResult = await emitEvent(socket, "Header:read", { ID });
    expect(readResult).toBeNull();

    const readDeepResult = await emitEvent(socket, "Header:readDeep", { ID });
    expect(readDeepResult).toBeNull();

    header.ID = ID;
    header.description += " - updated";
    // header.Items[0].description += " - updated";
    const updatedResultPromise = waitForEvent(socketOther, "Header:updated");
    const updateResult = await emitEvent(socket, "Header:update", header);
    expect(updateResult).toBeNull();
    const updatedResult = await updatedResultPromise;
    expect(cleanData(updatedResult)).toMatchSnapshot();
    expect(updatedResult.ID).toEqual(ID);

    const deletedResultPromise = waitForEvent(socketOther, "Header:deleted");
    const deleteResult = await emitEvent(socket, "Header:delete", { ID });
    expect(deleteResult).toBeNull();
    const deletedResult = await deletedResultPromise;
    expect(cleanData(deletedResult)).toMatchSnapshot();
    expect(deletedResult.ID).toEqual(ID);

    const listResult = await emitEvent(socket, "Header:list");
    expect(listResult).toBeNull();
  });

  test("Bound function", async () => {
    const result = await emitEvent(socket, "Header:boundFunction", { num: 1, text: "test" });
    expect(result).toBeNull();
  });

  test("Bound action", async () => {
    const result = await emitEvent(socket, "Header:boundAction", { num: 2, text: "test" });
    expect(result).toBeNull();
  });

  test("Event", async () => {
    const eventResultPromise = waitForEvent(socketOther, "customEvent");
    const result = await emitEvent(socket, "triggerCustomEvent", { num: 1, text: "test" });
    expect(result).toBeNull();
    const eventResult = await eventResultPromise;
    expect(eventResult.text).toBe("test1");
  });

  test("Event Tenant", async () => {
    const eventResultPromise = waitForEvent(socketOther, "customEvent");
    const eventNoResultPromise = waitForNoEvent(socketOtherTenant, "customEvent");
    const result = await emitEvent(socket, "triggerCustomEvent", { num: 1, text: "test" });
    expect(result).toBeNull();
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
    expect(result).toBeNull();
    let eventResult = await eventResultPromise;
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
    await disconnect(socket);
    await wait();
  });
});

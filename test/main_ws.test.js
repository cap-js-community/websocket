"use strict";

const cds = require("@sap/cds");

cds.test(__dirname + "/_env");

const { cleanData } = require("./_env/util/common");
const { connect, disconnect, emitEvent, waitForEvent } = require("./_env/util/ws");
const { read } = require("@sap/cds");

describe("Chat", () => {
  let socket;
  let socketOther;

  beforeAll(async () => {
    socket = await connect("/ws/main");
    socketOther = await connect("/ws/main");
  });

  afterAll(() => {
    disconnect(socket);
    disconnect(socketOther);
  });

  test("Unbound function", async () => {
    const result = emitEvent(socket, "unboundFunction", { num: 1, text: "test" });
    expect(result).toBeUndefined();
  });

  test("Unbound action", async () => {
    const result = emitEvent(socket, "unboundAction", { num: 2, text: "test" });
    expect(result).toBeUndefined();
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
    const createResult = emitEvent(socket, "Header:create", header);
    expect(createResult).toBeUndefined();
    const createdResult = await createdResultPromise;
    expect(cleanData(createdResult)).toMatchSnapshot();
    const ID = createdResult.ID;
    expect(createdResult.ID).toEqual(ID);

    const readResult = emitEvent(socket, "Header:read", { ID });
    expect(readResult).toBeUndefined();

    const readDeepResult = emitEvent(socket, "Header:readDeep", { ID });
    expect(readDeepResult).toBeUndefined();

    header.ID = ID;
    header.description += " - updated";
    // header.Items[0].description += " - updated";
    const updatedResultPromise = waitForEvent(socketOther, "Header:updated");
    const updateResult = emitEvent(socket, "Header:update", header);
    expect(updateResult).toBeUndefined();
    const updatedResult = await updatedResultPromise;
    expect(cleanData(updatedResult)).toMatchSnapshot();
    expect(updatedResult.ID).toEqual(ID);

    const deletedResultPromise = waitForEvent(socketOther, "Header:deleted");
    const deleteResult = emitEvent(socket, "Header:delete", { ID });
    expect(deleteResult).toBeUndefined();
    const deletedResult = await deletedResultPromise;
    expect(cleanData(deletedResult)).toMatchSnapshot();
    expect(deletedResult.ID).toEqual(ID);

    const listResult = emitEvent(socket, "Header:list");
    expect(listResult).toBeUndefined();
  });

  test("Bound function", async () => {
    const result = emitEvent(socket, "Header:boundFunction", { num: 1, text: "test" });
    expect(result).toBeUndefined();
  });

  test("Bound action", async () => {
    const result = emitEvent(socket, "Header:boundAction", { num: 2, text: "test" });
    expect(result).toBeUndefined();
  });

  test("Event", async () => {
    const eventResultPromise = waitForEvent(socketOther, "customEvent");
    const result = emitEvent(socket, "triggerCustomEvent", { num: 1, text: "test" });
    expect(result).toBeUndefined();
    const eventResult = await eventResultPromise;
    expect(eventResult.text).toBe("test1");
  });
});

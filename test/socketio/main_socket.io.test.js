"use strict";

const cds = require("@sap/cds");

cds.test(__dirname + "/../_env");

cds.env.websocket.kind = "socket.io";

const auth = require("../_env/util/auth");
const { cleanData, wait } = require("../_env/util/common");
const { connect, disconnect, emitEvent, waitForEvent, waitForNoEvent } = require("../_env/util/socket.io");

describe("Main", () => {
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

  test("Disconnects socket (last test)", async () => {
    await disconnect(socket); // for test coverage
    await wait();
    expect(socket).toBeDefined();
  });
});

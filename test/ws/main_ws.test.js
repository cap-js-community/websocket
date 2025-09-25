"use strict";

const cds = require("@sap/cds");

const auth = require("../_env/util/auth");
const { cleanData, wait } = require("../_env/util/common");

const { connect, disconnect, emitEvent, emitMessage, waitForEvent, waitForNoEvent } = require("../_env/util/ws");

cds.test(__dirname + "/../_env");

describe("Main", () => {
  let socket;
  let socketOther;
  let socketOtherTenant;

  let connected = false;
  let disconnected = false;
  let disconnectReason = false;

  beforeAll(async () => {
    cds.env.requires.auth.users.alice.tenant = "t1";
    const mainService = await cds.connect.to("MainService");
    mainService.after("wsConnect", async (req) => {
      connected = true;
    });
    mainService.after("wsDisconnect", async (data, req) => {
      disconnected = true;
      disconnectReason = req.data.reason;
    });
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

  test("Server", async () => {
    expect(cds.ws).toBeDefined();
    expect(cds.wss).toBeDefined();
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
    const createResult = await emitEvent(socket, "Header:create", header, { test: "header" });
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

  test("Event Exception", async () => {
    const result = await emitEvent(socket, "eventException", {});
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

  test("JSON format error", async () => {
    const result = await emitMessage(socket, "This is not a JSON!");
    expect(result).toEqual(null);
  });

  test("Disconnects socket (last test)", async () => {
    await disconnect(socket); // for test coverage
    await wait();
    const result = await emitEvent(socket, "triggerCustomEvent", { ID: "1234", num: 1, text: "test" });
    expect(result).toEqual(new Error("WebSocket is not open: readyState 3 (CLOSED)"));
    expect(connected).toBe(true);
    expect(disconnected).toBe(true);
    expect(disconnectReason).toBe("1005");
  });
});

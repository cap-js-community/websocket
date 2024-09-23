"use strict";

module.exports = (srv) => {
  const { Header } = srv.entities();

  srv.on("unboundFunction", async (req) => {
    return req.data.text + req.data.num;
  });

  srv.on("unboundAction", async (req) => {
    return req.data.text + req.data.num;
  });

  srv.on("boundFunction", Header, async (req) => {
    return req.data.text + req.data.num;
  });

  srv.on("boundAction", Header, async (req) => {
    return req.data.text + req.data.num;
  });

  srv.on("triggerCustomEvent", async (req) => {
    const text = req.data.text + req.data.num;
    await srv.emit("customEvent", { text });
    return text;
  });

  srv.on("triggerCustomContextEvent", async (req) => {
    const ID = req.data.ID;
    const text = req.data.text + req.data.num;
    await srv.emit("customContextIncludeEvent", { ID, text });
    await srv.emit("customContextExcludeEvent", { ID, text });
    return text;
  });

  srv.on("triggerCustomContextStaticEvent", async (req) => {
    const text = req.data.text + req.data.num;
    await srv.emit("customContextIncludeStaticEvent", { text });
    await srv.emit("customContextIncludeStaticEvent2", { text });
    await srv.emit("customContextExcludeStaticEvent", { text });
    await srv.emit("customContextExcludeStaticEvent2", { text });
    return text;
  });

  srv.on("triggerCustomContextMassEvent", async (req) => {
    const ID1 = req.data.ID1;
    const ID2 = req.data.ID2;
    const text = req.data.text + req.data.num;
    await srv.emit("customContextIncludeMassEvent", { IDs: [ID1, ID2], text });
    await srv.emit("customContextExcludeMassEvent", { IDs: [ID1, ID2], text });
    return text;
  });

  srv.on("triggerCustomContextUserEvent", async (req) => {
    const ID = req.data.ID;
    const text = req.data.text + req.data.num;
    await srv.emit("customContextUserIncludeEvent", { ID, text, user: req.context.user.id });
    await srv.emit("customContextUserExcludeEvent", { ID, text, user: req.context.user.id });
    return text + "-" + req.context.user.id;
  });

  srv.on("triggerCustomContextUserDynamicEvent", async (req) => {
    const ID = req.data.ID;
    const text = req.data.text + req.data.num;
    await srv.emit("customContextUserIncludeDynamicEvent", {
      ID,
      text,
      user: req.context.user.id,
      flag: req.context.user.id === "alice",
    });
    await srv.emit("customContextUserExcludeDynamicEvent", {
      ID,
      text,
      user: req.context.user.id,
      flag: req.context.user.id === "alice",
    });
    return text + "-" + req.context.user.id;
  });

  srv.on("triggerCustomDefinedUserEvent", async (req) => {
    const ID = req.data.ID;
    const text = req.data.text + req.data.num;
    await srv.emit("customDefinedUserIncludeEvent", { ID, text, user: req.context.user.id });
    await srv.emit("customDefinedUserExcludeEvent", { ID, text, user: req.context.user.id });
    return text + "-" + req.context.user.id;
  });

  srv.on("triggerCustomDefinedUserDynamicEvent", async (req) => {
    const ID = req.data.ID;
    const text = req.data.text + req.data.num;
    await srv.emit("customDefinedUserIncludeDynamicEvent", {
      ID,
      text,
      user: req.context.user.id,
      flag: ["alice", req.context.user.id],
    });
    await srv.emit("customDefinedUserExcludeDynamicEvent", {
      ID,
      text,
      user: req.context.user.id,
      flag: [req.context.user.id],
    });
    return text + "-" + req.context.user.id;
  });

  srv.on("triggerCustomContextHeaderEvent", async (req) => {
    const ID = req.data.ID;
    const text = req.data.text + req.data.num;
    await srv.emit(
      "customContextHeaderEvent",
      { ID, text },
      {
        context: [ID, new Date(), { a: 1 }],
        contexts: {
          include: [ID, new Date(), { a: 1 }],
          exclude: ["xxx"],
        },
        wsContext: [ID],
        wsContexts: [ID],
        user: {
          include: [],
          exclude: [],
        },
        wsUser: {
          include: [],
          exclude: [],
        },
        userInclude: [],
        wsUserInclude: [],
        userExclude: [],
        wsUserExclude: [],
        currentUser: {
          include: req.data.num === 0,
          exclude: req.data.num === 1,
        },
        wsCurrentUser: {
          include: req.data.num === 0,
          exclude: req.data.num === 1,
        },
        currentUserInclude: req.data.num === 0,
        wsCurrentUserExclude: req.data.num === 1,
        identifiers: [],
        identifier: {
          include: [],
          exclude: [],
        },
        wsIdentifier: {
          include: [],
          exclude: [],
        },
      },
    );
    return text + "-" + req.context.user.id;
  });

  srv.on("eventException", (req) => {
    throw new Error("An error occurred");
  });

  srv.on("wsConnect", async (req) => {});

  srv.on("wsDisconnect", async (req) => {});
};

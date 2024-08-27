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
    await srv.emit("customContextEvent", { ID, text });
    return text;
  });

  srv.on("triggerCustomContextStaticEvent", async (req) => {
    const text = req.data.text + req.data.num;
    await srv.emit("customContextStaticEvent", { text });
    await srv.emit("customContextStaticEvent2", { text });
    return text;
  });

  srv.on("triggerCustomContextMassEvent", async (req) => {
    const ID1 = req.data.ID1;
    const ID2 = req.data.ID2;
    const text = req.data.text + req.data.num;
    await srv.emit("customContextMassEvent", { IDs: [ID1, ID2], text });
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

  srv.on("triggerCustomContextHeaderEvent", async (req) => {
    const ID = req.data.ID;
    const text = req.data.text + req.data.num;
    await srv.emit(
      "customContextHeaderEvent",
      { ID, text },
      {
        wsContexts: [ID],
        contexts: [ID],
        // wsIncludeCurrentUser: req.data.num === 1,
        wsExcludeCurrentUser: req.data.num === 1,
        currentUser: {
          // include: req.data.num === 1,
          exclude: req.data.num === 1,
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

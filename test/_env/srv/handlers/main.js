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

  srv.on("wsConnect", async (req) => {});

  srv.on("wsDisconnect", async (req) => {});
};

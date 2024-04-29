"use strict";

module.exports = (srv) => {
  const { Header, HeaderItem } = srv.entities();

  srv.before("CREATE", Header, async (req) => {
    await srv.emit("received", req.data);
    await srv.emit("receivedToo", req.data);
  });

  srv.before("CREATE", HeaderItem, async (req) => {
    await srv.emit("identifierEvent", {
      ...req.data,
      identifier: req.data.description,
    });
  });

  srv.on("message", async (req) => {
    await srv.emit("identifierEvent", req.data.text, {
      wsIdentifier: req.data.text,
      identifier: req.data.text,
    });
  });
};

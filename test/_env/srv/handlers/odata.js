"use strict";

module.exports = (srv) => {
  const { Header, HeaderItem } = srv.entities;

  srv.before("CREATE", Header, async (req) => {
    await srv.emit("received", req.data);
    await srv.emit("receivedToo", req.data);
  });

  srv.before("CREATE", HeaderItem, async (req) => {
    await srv.emit("identifierIncludeEvent", {
      ...req.data,
      identifier: req.data.description,
    });
    await srv.emit("identifierIncludeContextEvent", {
      ...req.data,
      identifier: req.data.description,
      text: req.data.name,
    });
    await srv.emit("identifierExcludeEvent", {
      ...req.data,
      identifier: req.data.description,
    });
    await srv.emit("identifierExcludeContextEvent", {
      ...req.data,
      identifier: req.data.description,
      text: req.data.name,
    });
  });

  srv.on("message", async (req) => {
    await srv.emit("identifierIncludeEvent", req.data, {
      wsIdentifier: {
        include: [req.data.text],
      },
      identifier: req.data.text,
    });
    await srv.emit("identifierIncludeContextEvent", req.data, {
      wsIdentifier: {
        include: [req.data.text],
      },
      identifier: {
        include: req.data.text,
      },
    });
    await srv.emit("identifierExcludeEvent", req.data, {
      wsIdentifier: {
        exclude: [req.data.text],
      },
      identifier: {
        exclude: req.data.text,
      },
    });
    await srv.emit("identifierExcludeContextEvent", req.data, {
      wsIdentifier: {
        exclude: [req.data.text],
      },
      identifier: {
        exclude: req.data.text,
      },
    });
  });
};

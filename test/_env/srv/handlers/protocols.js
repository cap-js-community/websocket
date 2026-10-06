"use strict";

module.exports = (srv) => {
  srv.on("trigger", async (req) => {
    await srv.emit("test", { text: req.data.text, protocol: req.protocol });
    return req.data.text;
  });
};

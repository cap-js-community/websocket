"use strict";

module.exports = (srv) => {
  srv.on("trigger", async (req) => {
    await srv.emit("test", { text: req.data.text });
    return req.data.text;
  });
};

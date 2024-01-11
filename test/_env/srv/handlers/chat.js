"use strict";

module.exports = (srv) => {
  srv.on("message", async (req) => {
    await srv.emit("received", req.data);
    return req.data.text;
  });
};

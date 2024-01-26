"use strict";

module.exports = (srv) => {
  srv.on("message", async (req) => {
    req.data.user = req.user.id;
    await srv.emit("received", req.data);
    return req.data.text;
  });
};

"use strict";

module.exports = (srv) => {
  srv.on("message", async (req) => {
    req.data.user = req.user.id;
    await srv.emit("received", req.data, {
      ws: {
        header: "value",
      },
    });
    return req.data.text;
  });
};

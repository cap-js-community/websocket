"use strict";

module.exports = (srv) => {
  srv.on(["sendCloudEvent"], async (req) => {
    await srv.emit("cloudEvent", req.data.data);
  });
};

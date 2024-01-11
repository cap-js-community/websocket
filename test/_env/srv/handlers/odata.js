"use strict";

module.exports = (srv) => {
  const { Header } = srv.entities();

  srv.before("CREATE", Header, async (req) => {
    await srv.emit("received", req.data);
    await srv.emit("receivedToo", req.data);
  });
};

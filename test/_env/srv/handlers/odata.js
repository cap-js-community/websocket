"use strict";

module.exports = (srv) => {
  const { Header } = srv.entities();

  srv.before("CREATE", Header, async (req) => {
    srv.emit("received", req.data);
    srv.emit("receivedToo", req.data);
  });
};

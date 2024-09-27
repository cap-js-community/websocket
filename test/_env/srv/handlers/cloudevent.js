"use strict";

module.exports = (srv) => {
  srv.on("sendCloudEvent", async (req) => {
    await srv.emit("cloudEvent1", {
      appinfoA: req.data.appinfoA || "abc",
      appinfoB: req.data.appinfoB || 123,
      appinfoC: req.data.appinfoC || true,
    });
    await srv.emit("cloudEvent2", {
      appinfoA: req.data.appinfoA || "abc",
      appinfoB: req.data.appinfoB || 123,
      appinfoC: req.data.appinfoC || true,
    });
    await srv.emit("cloudEvent3", {
      specversion: "1.1",
      type: "com.example.someevent",
      source: "/mycontext",
      subject: "example",
      id: "C234-1234-1234",
      time: "2018-04-05T17:31:00Z",
      extension1: "value",
      othervalue: 5,
      datacontenttype: "application/cloudevents+json",
      appinfoA: req.data.appinfoA || "abc",
      appinfoB: req.data.appinfoB || 123,
      appinfoC: req.data.appinfoC || true,
    });
    await srv.emit("cloudEvent4", {
      appinfoA: req.data.appinfoA || "abc",
      appinfoB: req.data.appinfoB || 123,
      appinfoC: req.data.appinfoC || true,
    }, {
      ws: {
        specversion: "1.1",
        type: "com.example.someevent",
        source: "/mycontext",
        subject: "example",
        id: "C234-1234-1234",
        time: "2018-04-05T17:31:00Z",
        extension1: "value",
        othervalue: 5,
        datacontenttype: "application/cloudevents+json",
      }
    });
    return true;
  });
};

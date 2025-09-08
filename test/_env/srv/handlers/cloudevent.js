"use strict";

module.exports = (srv) => {
  srv.on("wsContext", async () => {});

  srv.on(["sendCloudEventModel", "sendCloudEventMap"], async (req) => {
    const appinfoA = (req.data.appinfoA ?? req.data.data?.appinfoA ?? "abc") + "d";
    const appinfoB = (req.data.appinfoB ?? req.data.data?.appinfoB ?? 123) + 1111;
    const appinfoC = (req.data.appinfoC ?? req.data.data?.appinfoC ?? true) !== true;

    await srv.emit("cloudEvent1", {
      appinfoA,
      appinfoB,
      appinfoC,
    });

    await srv.emit("cloudEvent2", {
      appinfoA,
      appinfoB,
      appinfoC,
    });

    await srv.emit("cloudEvent3", {
      specversion: "1.1",
      type: "com.example.someevent.cloudEvent3",
      source: "/mycontext",
      subject: req.data._subject || "example",
      id: "C234-1234-1234",
      time: "2018-04-05T17:31:00Z",
      extension1: "value",
      othervalue: 5,
      datacontenttype: "application/cloudevents+json",
      appinfoA,
      appinfoB,
      appinfoC,
    });

    await srv.emit(
      "cloudEvent4",
      {
        appinfoA,
        appinfoB,
        appinfoC,
      },
      {
        "x-ws-cloudevent-comexampleextension1": "value2",
        "x-websocket-cloudevent-source": "/mycontext",
        ws: {
          specversion: "1.1",
          type: "com.example.someevent.cloudEvent4",
          source: "/mycontext",
          subject: req.data._subject || "example",
          id: "C234-1234-1234",
          time: "2018-04-05T17:31:00Z",
          cloudevent: {
            comexampleextension1: "value",
            comexampleothervalue: 5,
            datacontenttype: "application/cloudevents+json",
          },
        },
      },
    );

    await srv.emit("cloudEvent5", {
      specversion: "1.1",
      type: "com.example.someevent.cloudEvent5",
      source: "/mycontext",
      subject: req.data._subject || "example",
      id: "C234-1234-1234",
      time: "2018-04-05T17:31:00Z",
      comexampleextension1: "value",
      comexampleothervalue: 5,
      datacontenttype: "application/cloudevents+json",
      data: {
        appinfoA,
        appinfoB,
        appinfoC,
      },
    });
    return true;
  });

  srv.on("sendCloudEventContext", async (req) => {
    await srv.emit(
      "cloudEvent1",
      {
        appinfoA: "abcd",
        appinfoB: 1234,
        appinfoC: false,
      },
      {
        context: "context",
      },
    );
  });
};

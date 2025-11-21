"use strict";

module.exports = (srv) => {
  srv.on("wsContext", async () => {});

  srv.on("sendNotification", async (req) => {
    await srv.emit("notification1", {
      field1: req.data.field1 || "value1",
      field2: req.data.field2 || "value2",
    });
    await srv.emit("notification2", {
      message: req.data.message || "this is the body!",
      field1: req.data.field1 || "value1",
      field2: req.data.field2 || "value2",
    });
    await srv.emit("notification3", {
      message: "no body!",
      action: "MESSAGE",
      field1: req.data.field1 || "value1",
      field2: req.data.field2 || "value2",
    });
    await srv.emit(
      "notification4",
      {
        message: "no body!",
        action: "MESSAGE",
        field1: req.data.field1 || "value1",
        field2: req.data.field2 || "value2",
        field3: "ignore",
      },
      {
        ws: {
          pcpaction: "ABC",
          pcpmessage: "Header",
        },
      },
    );
    return true;
  });

  srv.on("sendNotificationWithContext", async (req) => {
    await srv.emit(
      "notification1",
      {
        field1: req.data.field1 || "value1",
        field2: req.data.field2 || "value2",
      },
      {
        context: "context",
      },
    );
    return true;
  });

  srv.on("triggerSideEffects", async () => {
    await srv.emit("sideEffect1", {
      sideEffectSource: "/Header(ID='e0582b6a-6d93-46d9-bd28-98723a285d40')",
    });
    return true;
  });
};

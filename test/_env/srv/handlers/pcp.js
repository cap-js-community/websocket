"use strict";

module.exports = (srv) => {
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
};

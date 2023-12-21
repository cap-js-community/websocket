"use strict";

const cds = require("@sap/cds");

module.exports = class TodoService extends cds.ApplicationService {
  init() {
    super.init();

    this.after("*", (data, context) => {
      const { Todo } = this.entities();
      context.on("succeeded", async () => {
        const ID = context.params?.[0]?.ID;
        if (ID && context.target === Todo && ["CREATE", "UPDATE", "DELETE"].includes(context.event)) {
          const service = await cds.connect.to("TodoWSService");
          await service.emit("refresh", { ID });
        }
      });
    });
  }
};

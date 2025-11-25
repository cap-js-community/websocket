"use strict";

const cds = require("@sap/cds");
const log = cds.log("fiori");

module.exports = class CatalogService extends cds.ApplicationService {
  init() {
    const { Books } = this.entities;

    this.on(Books.actions.submitOrder, async (req) => {
      const { quantity } = req.data;
      const { ID } = req.params[0];
      log.info(`Order received for book ID ${ID} (quantity: ${quantity})`);

      const task = cds.spawn({ after: 1000 }, async (tx) => {
        await tx.run(UPDATE(req.subject).set({ stock: { "-=": quantity } }));
      });

      task.on("succeeded", () => {
        log.info(`Stock updated for book ID ${ID} (quantity: -${quantity})`);
        this.emit("stockChanged", {
          sideEffectSource: `/Books(${ID})`,
        });
        log.info(`Stock change event emitted for book ID ${ID}`);
      });
    });

    return super.init();
  }
};

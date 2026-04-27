"use strict";

const cds = require("@sap/cds");

module.exports = class CatalogService extends cds.ApplicationService {
  init() {
    const { Books, ListOfBooks } = this.entities;

    // Add some discount for overstocked books
    this.after("each", ListOfBooks, (book) => {
      if (book.stock > 111) {
        book.title += ` -- 11% discount!`;
      }
    });

    // Reduce stock of ordered books if available stock suffices
    this.on(Books.actions.submitOrder, async (req) => {
      const { quantity } = req.data;
      const { ID: id } = req.params[0];
      const book = await SELECT.one.from(req.subject, (b) => b.stock);

      if (!book) {
        return req.error(404, `Book #${id} doesn't exist`);
      }
      if (quantity < 1) {
        return req.error(400, `quantity has to be 1 or more`);
      }
      if (!book.stock || quantity > book.stock) {
        return req.error(409, `${quantity} exceeds stock for book #${id}`);
      }

      await UPDATE(req.subject).with({ stock: (book.stock -= quantity) });
      return book;
    });

    // Emit event when an order has been submitted
    this.after(Books.actions.submitOrder, async (_, req) => {
      const { quantity } = req.data;
      const { ID: book } = req.params[0];
      await this.emit("OrderedBook", { book, quantity, buyer: req.user.id });
    });

    return super.init();
  }
};

"use strict";

sap.ui.define(["sap/fe/core/AppComponent", "sap/ui/core/ws/WebSocket"], function (AppComponent, WebSocket) {
  return AppComponent.extend("todo.Component", {
    metadata: {
      manifest: "json",
    },

    constructor: function () {
      AppComponent.prototype.constructor.apply(this, arguments);
      window.socket = new WebSocket("/ws/todo");
    },
  });
});

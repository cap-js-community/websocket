"use strict";

sap.ui.define(
  ["sap/fe/core/AppComponent", "sap/ui/core/ws/WebSocket", "sap/ui/core/ws/ReadyState"],
  function (AppComponent, WebSocket, ReadyState) {
    const KEEP_ALIVE_INTERVAL = 60 * 1000; // 1 minute

    return AppComponent.extend("todo.Component", {
      metadata: {
        manifest: "json",
      },

      constructor: function () {
        AppComponent.prototype.constructor.apply(this, arguments);
        this.websocket("/ws/todo");
      },

      websocket: function (sUrl, sName = "main") {
        window.websockets ??= {};
        window.websockets[sName] = {
          _ws: undefined,
          _contexts: [],
          _handlers: [],
          _interval: setInterval(() => {
            window.websockets?.[sName]?.init();
          }, KEEP_ALIVE_INTERVAL),
          reset: function () {
            this._ws?.close();
            this._ws = undefined;
            this._contexts = [];
            this._handlers = [];
          },
          init: function () {
            if (this._ws?.getReadyState() === ReadyState.OPEN) {
              return;
            }
            this._ws = new WebSocket(sUrl);
            this._ws.attachClose((oEvent) => {
              if (oEvent.getSource() === this._ws) {
                this._ws = undefined;
              }
            });
            this._ws.attachError((oEvent) => {
              if (oEvent.getSource() === this._ws) {
                this._ws = undefined;
              }
            });
            for (const fnCallback of this._handlers) {
              this._attach(fnCallback);
            }
            for (const oContext of this._contexts) {
              this._send(oContext);
            }
          },
          send: function (oMessage) {
            this.init();
            this._send(oMessage);
            if (oMessage.event === "wsContext") {
              this._contexts.push(oMessage);
            }
          },
          message: function (fnCallback) {
            this.init();
            this._attach(fnCallback);
            this._handlers.push(fnCallback);
          },
          _send: function (oData) {
            this._ws.send(JSON.stringify(oData));
          },
          _attach: function (fnCallback) {
            this._ws.attachMessage("message", (oEvent) => {
              const oMessage = JSON.parse(oEvent.getParameter("data"));
              fnCallback(oMessage, oEvent);
            });
          },
        };
        window.websockets[sName].reset();
        window.websockets[sName].init();
      },
    });
  },
);

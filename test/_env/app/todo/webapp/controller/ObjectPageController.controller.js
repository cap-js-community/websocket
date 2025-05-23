"use strict";

sap.ui.define(
  ["sap/ui/core/mvc/ControllerExtension", "sap/m/MessageToast"],
  function (ControllerExtension, MessageToast) {
    return ControllerExtension.extend("todo.controller.ObjectPageController", {
      override: {
        onInit: function () {
          this.base.onInit();
          socket.attachMessage("message", (event) => {
            const object = this.base.getExtensionAPI().getBindingContext()?.getObject();
            const message = JSON.parse(event.getParameter("data"));
            if (message.event === "refresh") {
              if (object?.ID === message?.data?.ID && object?.IsActiveEntity) {
                this.base.getExtensionAPI().refresh();
                const router = this.base.getAppComponent().getRouter();
                if (router && router.getHashChanger().getHash().startsWith("Todo")) {
                  MessageToast.show("Object Page refreshed");
                }
              }
            }
          });
        },
      },
    });
  },
);

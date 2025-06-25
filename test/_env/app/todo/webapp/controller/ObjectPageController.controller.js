"use strict";

sap.ui.define(
  ["sap/ui/core/mvc/ControllerExtension", "sap/m/MessageToast"],
  function (ControllerExtension, MessageToast) {
    return ControllerExtension.extend("todo.controller.ObjectPageController", {
      override: {
        onInit: function () {
          this.base.onInit();
          window.websockets?.message((message) => {
            if (message.event === "refresh") {
              const object = this.base.getExtensionAPI().getBindingContext()?.getObject();
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

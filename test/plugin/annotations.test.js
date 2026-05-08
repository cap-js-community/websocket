"use strict";

const cds = require("@sap/cds");

cds.test(__dirname + "/../_env");

describe("Annotations", () => {
  describe("Service-level annotations (ws + odata)", () => {
    test("FioriService has @Common.WebSocketBaseURL", () => {
      const service = cds.model.definitions["FioriService"];
      expect(service["@Common.WebSocketBaseURL"]).toBe("ws/fiori");
    });

    test("FioriService has @Common.WebSocketChannel#sideEffects", () => {
      const service = cds.model.definitions["FioriService"];
      expect(service["@Common.WebSocketChannel#sideEffects"]).toBe("sideeffects");
    });

    test("AnnotationService has @Common.WebSocketBaseURL", () => {
      const service = cds.model.definitions["AnnotationService"];
      expect(service["@Common.WebSocketBaseURL"]).toBe("ws/annotations");
    });

    test("AnnotationService has @Common.WebSocketChannel#sideEffects", () => {
      const service = cds.model.definitions["AnnotationService"];
      expect(service["@Common.WebSocketChannel#sideEffects"]).toBe("sideeffects");
    });

    test("ODataService has @Common.WebSocketBaseURL (ws-enabled events)", () => {
      const service = cds.model.definitions["ODataService"];
      expect(service["@Common.WebSocketBaseURL"]).toBe("ws/odata");
    });
  });

  describe("Service-level annotations not added (ws-only or odata-only)", () => {
    test("ChatService has no @Common.WebSocketBaseURL (ws-only, no odata)", () => {
      const service = cds.model.definitions["ChatService"];
      expect(service["@Common.WebSocketBaseURL"]).toBeUndefined();
    });

    test("PCPService has no @Common.WebSocketBaseURL (ws-only, no odata)", () => {
      const service = cds.model.definitions["PCPService"];
      expect(service["@Common.WebSocketBaseURL"]).toBeUndefined();
    });
  });

  describe("Side effect annotation auto-derivation", () => {
    test("AnnotationService.nameChanged gets @ws.pcp.sideEffect", () => {
      const event = cds.model.definitions["AnnotationService.nameChanged"];
      expect(event["@ws.pcp.sideEffect"]).toBe(true);
      expect(event["@ws.format"]).toBe("pcp");
    });

    test("AnnotationService.stockChanged gets @ws.pcp.sideEffect", () => {
      const event = cds.model.definitions["AnnotationService.stockChanged"];
      expect(event["@ws.pcp.sideEffect"]).toBe(true);
      expect(event["@ws.format"]).toBe("pcp");
    });

    test("AnnotationService.otherEvent does not get @ws.pcp.sideEffect", () => {
      const event = cds.model.definitions["AnnotationService.otherEvent"];
      expect(event["@ws.pcp.sideEffect"]).toBeUndefined();
      expect(event["@ws.format"]).toBeUndefined();
    });

    test("FioriService.stockChanged preserves existing @ws.pcp.sideEffect", () => {
      const event = cds.model.definitions["FioriService.stockChanged"];
      expect(event["@ws.pcp.sideEffect"]).toBe(true);
      expect(event["@ws.format"]).toBe("pcp");
    });

    test("PCPService.sideEffect1 not affected (ws-only service, no odata)", () => {
      const event = cds.model.definitions["PCPService.sideEffect1"];
      expect(event["@ws.pcp.sideEffect"]).toBeTruthy();
    });

    test("ODataService events without @Common.SideEffects are not annotated", () => {
      const event = cds.model.definitions["ODataService.received"];
      expect(event["@ws.pcp.sideEffect"]).toBeUndefined();
    });
  });
});

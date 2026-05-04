"use strict";

const cds = require("@sap/cds");
const addWebSocketAnnotations = require("./src/annotations");

cds.on("loaded", (csn) => {
  addWebSocketAnnotations(csn);
});

"use strict";

const cds = require("@sap/cds");
const defaults = { path: "/ws", impl: "@cap-js-community/websocket" };
const protocols = (cds.env.protocols ??= {});
protocols.websocket ??= {};
protocols.websocket = { ...defaults, ...protocols.websocket };
protocols.ws ??= {};
protocols.ws = { ...defaults, ...protocols.ws };

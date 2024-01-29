"use strict";

const alice = `Basic ${Buffer.from("alice:alice").toString("base64")}`;
const bob = `Basic ${Buffer.from("bob:bob").toString("base64")}`;
const invalid = `Basic ${Buffer.from("invalid:invalid").toString("base64")}`;

module.exports = {
  alice,
  bob,
  invalid,
};

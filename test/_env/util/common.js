"use strict";

const credentials = "alice:alice";
const authorization = `Basic ${Buffer.from(credentials).toString("base64")}`;

function cleanData(data) {
  const isArray = Array.isArray(data);
  data = isArray ? data : [data];
  const result = data.map((row) => {
    row = { ...row };
    for (const name in row) {
      if (["ID", "createdAt", "modifiedAt"].includes(name) || name.endsWith("_ID")) {
        delete row[name];
      } else if (Array.isArray(row[name])) {
        row[name] = cleanData(row[name]);
      }
    }
    return row;
  });
  return isArray ? result : result[0];
}

module.exports = {
  credentials,
  authorization,
  cleanData,
};

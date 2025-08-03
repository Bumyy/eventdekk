const { v4: uuidv4 } = require("uuid");

module.exports = (title) => {
  const shortId = uuidv4().split("-")[0];
  return `${title}-${shortId}.webp`.toLowerCase().replace(/\s+/g, "-");
};

const sharp = require("sharp");

module.exports = {
  processImage: async (buffer) => {
    return sharp(buffer).webp({ quality: 80 }).resize(1200).toBuffer();
  },
};

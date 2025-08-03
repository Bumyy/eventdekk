const generateFilename = require("../utils/filename.util");
const imageService = require("../services/image.service");
const storageService = require("../services/storage.service");

module.exports = {
  uploadImage: async (req, res) => {
    try {
      if (!req.file) throw new Error("No image uploaded");
      if (!req.body.title) throw new Error("Title is required");

      const fileName = generateFilename(req.body.title);
      const processedImage = await imageService.processImage(req.file.buffer);
      await storageService.uploadFile(fileName, processedImage);

      res.json({
        url: `https://${process.env.R2_PUBLIC_DOMAIN}/${fileName}`,
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },
};

const express = require("express");
const router = express.Router();
const upload = require("../config/multer.config");
const uploadController = require("../controllers/upload.controller");

router.post("/", upload.single("image"), uploadController.uploadImage);

module.exports = router;

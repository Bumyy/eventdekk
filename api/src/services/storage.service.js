const { PutObjectCommand } = require("@aws-sdk/client-s3");
const s3 = require("../config/aws.config");

module.exports = {
  uploadFile: async (fileName, buffer) => {
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: "image/webp",
    });
    return s3.send(command);
  },
};

// dependencies
const AWS = require('aws-sdk');
const sharp = require('sharp');

// get reference to S3 client
const s3 = new AWS.S3();

const originalDir = "images";
const targetSizes = {
  thumb: 256,
  middle: 512,
};
const outExtensions = ["original", "webp"];

exports.handler = async function (event, context, callback) {
  const srcBucket = event.Records[0].s3.bucket.name;
  // Object key may have spaces or unicode non-ASCII characters.
  const srcKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
  if (!srcKey.startsWith(`${originalDir}/`)) {
    return;
  }
  const dstBucket = srcBucket;

  // Infer the image type.
  const typeMatch = srcKey.match(/\.([^.]*)$/);
  if (!typeMatch) {
    callback("Could not determine the image type.");
    return;
  }
  const imageType = typeMatch[1].toLowerCase();
  if (!["jpg", "jpeg", "png"].includes(imageType)) {
    callback(`Unsupported image type: ${imageType}`);
    return;
  }

  const image = await s3.getObject({Bucket: srcBucket, Key: srcKey}).promise();
  Object.entries(targetSizes).forEach(async ([kind, size], i) => {
    outExtensions.forEach(async outExt => {
      let resized;
      let dstKey = srcKey.replace(`${originalDir}/`, `${kind}/`);
      let contentType = image.ContentType;
      if (outExt === "original") {
        resized = await sharp(image.Body).resize(size).toBuffer();
      }
      else if (outExt === "webp") {
        resized = await sharp(image.Body).resize(size).webp().toBuffer();
        dstKey = dstKey.replace(/(jpg|jpeg|png)$/i, "webp");
        contentType = contentType.replace(/(jpg|jpeg|png)$/i, "webp");
      }
      const result = await s3.putObject(
        {
          Bucket: dstBucket,
          Key: dstKey,
          Body: resized,
          ContentType: contentType,
          ACL: "public-read",
          CacheControl: "max-age=31536000"
        }
      ).promise().catch(err => {console.error(err)});
    });
  });
  callback(null, `resized ${srcBucket}: ${srcKey}`);
};

const cloudinary = require('cloudinary').v2;

function getCloudName() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.');
  }
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
  return cloudName;
}

function decodeBase64(value, defaultMimeType) {
  const input = String(value || '').trim();
  const dataUri = /^data:([^;,]+);base64,([\s\S]+)$/i.exec(input);
  const encoded = (dataUri ? dataUri[2] : input).replace(/\s/g, '');
  if (!encoded || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) {
    throw new Error('The uploaded file is not valid base64 data.');
  }
  const buffer = Buffer.from(encoded, 'base64');
  if (!buffer.length) throw new Error('The uploaded file is empty.');
  return { buffer, mimeType: dataUri ? dataUri[1] : defaultMimeType };
}

function uploadBuffer(buffer, { folder, publicId, resourceType, overwrite = false }) {
  getCloudName();
  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      { folder, public_id: publicId, resource_type: resourceType, overwrite, invalidate: overwrite },
      (error, result) => {
        if (error) return reject(error);
        if (!result || !result.public_id || !result.secure_url) {
          return reject(new Error('Cloudinary did not return the uploaded asset details.'));
        }
        resolve(result);
      }
    );
    upload.on('error', reject);
    upload.end(buffer);
  });
}

function uploadFile(filePath, { folder, publicId, resourceType, overwrite = false }) {
  getCloudName();
  return cloudinary.uploader.upload(filePath, {
    folder,
    public_id: publicId,
    resource_type: resourceType,
    overwrite,
    invalidate: overwrite,
  });
}

function uploadBase64(value, options) {
  const { buffer } = decodeBase64(value, options.defaultMimeType);
  return uploadBuffer(buffer, options);
}

function deleteAsset(publicId, resourceType) {
  if (!publicId) return Promise.resolve(null);
  getCloudName();
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType, type: 'upload', invalidate: true })
    .then(result => {
      if (result && result.result !== 'ok' && result.result !== 'not found') {
        throw new Error('Cloudinary did not confirm asset deletion.');
      }
      return result;
    });
}

module.exports = { getCloudName, decodeBase64, uploadBuffer, uploadFile, uploadBase64, deleteAsset };

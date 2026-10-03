const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Recording = require('../models/Recording');
const Employee = require('../models/Employee');
const { decodeBase64, uploadBuffer, uploadFile, uploadBase64 } = require('../services/cloudinary');

const envCandidates = [
  path.join(__dirname, '../../uploads/.env'),
  path.join(__dirname, '../../.env'),
];
const envPath = envCandidates.find(candidate => fs.existsSync(candidate));
if (envPath) dotenv.config({ path: envPath });
else dotenv.config();

const uploadsDir = path.join(__dirname, '../../uploads/recordings');

function safePublicId(value) {
  return String(value || 'unknown').replace(/[^\w-]/g, '_');
}

function findLocalRecording(rec) {
  const candidates = [rec.fileName, rec.audioUrl ? path.basename(rec.audioUrl) : ''];
  for (const name of candidates) {
    if (!name || path.basename(name) !== name || !/^[\w.-]+$/.test(name)) continue;
    const filePath = path.join(uploadsDir, name);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) return filePath;
  }
  return null;
}

async function migrateRecordings() {
  const stats = { migrated: 0, skipped: 0, failed: 0 };
  const cursor = Recording.find({
    $and: [
      { $or: [{ cloudinaryPublicId: '' }, { cloudinaryPublicId: null }, { cloudinaryPublicId: { $exists: false } }] },
      { $or: [{ cloudinarySecureUrl: '' }, { cloudinarySecureUrl: null }, { cloudinarySecureUrl: { $exists: false } }] },
    ],
  }).cursor();

  for await (const rec of cursor) {
    try {
      const localFile = findLocalRecording(rec);
      let asset;
      if (localFile) {
        asset = await uploadFile(localFile, {
          folder: 'telesales/recordings',
          publicId: `legacy_${safePublicId(rec.id || rec._id)}`,
          resourceType: 'video',
          overwrite: true,
        });
      } else if (rec.audioData) {
        const { buffer } = decodeBase64(rec.audioData, 'audio/wav');
        asset = await uploadBuffer(buffer, {
          folder: 'telesales/recordings',
          publicId: `legacy_${safePublicId(rec.id || rec._id)}`,
          resourceType: 'video',
          overwrite: true,
        });
      } else {
        stats.skipped += 1;
        continue;
      }

      const updated = await Recording.updateOne(
        { _id: rec._id, cloudinaryPublicId: { $in: ['', null] } },
        {
          $set: {
            cloudinaryPublicId: asset.public_id,
            cloudinarySecureUrl: asset.secure_url,
            storageSizeBytes: Number(asset.bytes) || rec.storageSizeBytes || 0,
            audioData: '',
          },
        }
      );
      if (updated.matchedCount) stats.migrated += 1;
      else stats.skipped += 1;
    } catch (error) {
      stats.failed += 1;
      console.error(`Recording ${rec.id || rec._id} could not be migrated: ${error.message}`);
    }
  }
  return stats;
}

async function migrateProfilePhotos() {
  const stats = { migrated: 0, skipped: 0, failed: 0 };
  const cursor = Employee.find({
    photoBase64: { $exists: true, $nin: ['', null] },
    $or: [{ cloudinaryPhotoPublicId: '' }, { cloudinaryPhotoPublicId: null }, { cloudinaryPhotoPublicId: { $exists: false } }],
  }).cursor();

  for await (const emp of cursor) {
    try {
      const asset = await uploadBase64(emp.photoBase64, {
        folder: 'telesales/profile-photos',
        publicId: safePublicId(emp.id),
        resourceType: 'image',
        overwrite: true,
        defaultMimeType: 'image/jpeg',
      });
      const updated = await Employee.updateOne(
        { _id: emp._id, cloudinaryPhotoPublicId: { $in: ['', null] }, photoBase64: emp.photoBase64 },
        {
          $set: {
            photoBase64: '',
            avatarUrl: asset.secure_url,
            cloudinaryPhotoPublicId: asset.public_id,
          },
        }
      );
      if (updated.matchedCount) stats.migrated += 1;
      else stats.skipped += 1;
    } catch (error) {
      stats.failed += 1;
      console.error(`Profile photo for ${emp.id} could not be migrated: ${error.message}`);
    }
  }
  return stats;
}

async function main() {
  const connected = await connectDB();
  if (!connected) throw new Error('Could not connect to MongoDB.');
  const recordings = await migrateRecordings();
  const photos = await migrateProfilePhotos();
  console.log('Cloudinary migration complete.');
  console.log(`Recordings: ${recordings.migrated} migrated, ${recordings.skipped} skipped, ${recordings.failed} failed.`);
  console.log(`Profile photos: ${photos.migrated} migrated, ${photos.skipped} skipped, ${photos.failed} failed.`);
  if (recordings.failed || photos.failed) process.exitCode = 1;
}

main()
  .catch(error => {
    console.error(`Cloudinary migration stopped: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState) await mongoose.disconnect();
  });

const fs = require('fs');
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} = require('@aws-sdk/client-s3');

let client;

function isEnabled() {
  const provider = process.env.STORAGE_PROVIDER || 'local';
  if (!['local', 's3'].includes(provider)) throw new Error('STORAGE_PROVIDER must be either local or s3');
  return provider === 's3';
}

function bucketName() {
  if (!process.env.S3_BUCKET) throw new Error('S3_BUCKET is required when STORAGE_PROVIDER=s3');
  return process.env.S3_BUCKET;
}

function getClient() {
  if (!process.env.S3_REGION) throw new Error('S3_REGION is required when STORAGE_PROVIDER=s3');
  const accessKeyId = process.env.S3_ACCESS_KEY;
  const secretAccessKey = process.env.S3_SECRET_KEY;
  if (Boolean(accessKeyId) !== Boolean(secretAccessKey)) {
    throw new Error('S3_ACCESS_KEY and S3_SECRET_KEY must be configured together');
  }
  if (!client) {
    client = new S3Client({
      region: process.env.S3_REGION,
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: Boolean(process.env.S3_ENDPOINT),
      credentials: accessKeyId ? { accessKeyId, secretAccessKey } : undefined
    });
  }
  return client;
}

async function uploadFile(filePath, key, contentType) {
  const bucket = bucketName();
  const { size } = await fs.promises.stat(filePath);
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fs.createReadStream(filePath),
      ContentType: contentType,
      ContentLength: size
    })
  );
  return bucket;
}

async function getFile(bucket, key) {
  return getClient().send(new GetObjectCommand({ Bucket: bucket || bucketName(), Key: key }));
}

async function deleteFile(bucket, key) {
  return getClient().send(new DeleteObjectCommand({ Bucket: bucket || bucketName(), Key: key }));
}

module.exports = { isEnabled, getClient, uploadFile, getFile, deleteFile };

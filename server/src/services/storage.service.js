import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let client;

function getStorageConfig() {
  const bucket = process.env.S3_BUCKET?.trim();
  const region = process.env.S3_REGION?.trim() || "us-east-1";
  const endpoint = process.env.S3_ENDPOINT?.trim() || undefined;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();

  if (!bucket) {
    throw new Error("S3 storage is not configured: S3_BUCKET is missing.");
  }

  if (Boolean(accessKeyId) !== Boolean(secretAccessKey)) {
    throw new Error(
      "S3 configuration is incomplete: configure both access and secret keys, or neither."
    );
  }

  return {
    bucket,
    region,
    endpoint,
    accessKeyId,
    secretAccessKey,
  };
}

function getS3Client(config) {
  if (!client) {
    client = new S3Client({
      region: config.region,
      ...(config.endpoint ? { endpoint: config.endpoint } : {}),
      ...(config.accessKeyId && config.secretAccessKey
        ? {
            credentials: {
              accessKeyId: config.accessKeyId,
              secretAccessKey: config.secretAccessKey,
            },
          }
        : {}),
      forcePathStyle:
        (process.env.S3_FORCE_PATH_STYLE || "false").toLowerCase() === "true",
    });
  }

  return client;
}

function validateObjectKey(key) {
  if (
    typeof key !== "string" ||
    !key.trim() ||
    key.startsWith("/") ||
    key.split("/").some((part) => part === "." || part === "..") ||
    key.includes("\\")
  ) {
    throw new Error("Invalid storage object key.");
  }

  return key;
}

export async function createUploadUrl({
  key,
  contentType,
  expiresInSeconds = 300,
}) {
  const config = getStorageConfig();
  validateObjectKey(key);

  if (
    typeof contentType !== "string" ||
    !/^[\w.+-]+\/[\w.+-]+$/.test(contentType)
  ) {
    throw new Error("A valid content type is required.");
  }

  if (
    !Number.isInteger(expiresInSeconds) ||
    expiresInSeconds < 30 ||
    expiresInSeconds > 900
  ) {
    throw new Error("Upload URL expiry must be between 30 and 900 seconds.");
  }

  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(getS3Client(config), command, {
    expiresIn: expiresInSeconds,
  });
}

export async function createDownloadUrl({
  key,
  expiresInSeconds = 300,
}) {
  const config = getStorageConfig();
  validateObjectKey(key);

  if (
    !Number.isInteger(expiresInSeconds) ||
    expiresInSeconds < 30 ||
    expiresInSeconds > 900
  ) {
    throw new Error("Download URL expiry must be between 30 and 900 seconds.");
  }

  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });

  return getSignedUrl(getS3Client(config), command, {
    expiresIn: expiresInSeconds,
  });
}

export async function deleteStoredObject({ key }) {
  const config = getStorageConfig();
  validateObjectKey(key);

  await getS3Client(config).send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key,
    })
  );
}


export async function verifyStoredObject({
  key,
  expectedSize,
  expectedContentType,
}) {
  const config = getStorageConfig();
  validateObjectKey(key);

  const result = await getS3Client(config).send(
    new HeadObjectCommand({
      Bucket: config.bucket,
      Key: key,
    })
  );

  if (
    result.ContentLength !== Number(expectedSize) ||
    result.ContentType !== expectedContentType
  ) {
    throw new Error(
      "Uploaded object size or content type does not match its metadata."
    );
  }

  return {
    sizeBytes: result.ContentLength,
    contentType: result.ContentType,
  };
}

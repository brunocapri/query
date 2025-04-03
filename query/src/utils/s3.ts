import { S3Client } from '@aws-sdk/client-s3';

// Initialize S3 client
export const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// S3 bucket name
export const S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || '';

// Validate S3 configuration
export const validateS3Config = () => {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_S3_BUCKET_NAME) {
    throw new Error('Missing required AWS credentials or bucket name');
  }
}; 
import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, S3_BUCKET_NAME, validateS3Config } from '@/utils/s3';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    // Validate S3 configuration
    validateS3Config();

    console.log("Cheguei aqui");

    // Get the form data from the request
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Generate a unique file name
    const fileExtension = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: `documents/${fileName}`,
      Body: buffer,
      ContentType: file.type,
    });

    await s3Client.send(command);

    // Return the file information
    return NextResponse.json({
      success: true,
      fileName: fileName,
      originalName: file.name,
      fileType: file.type,
      fileSize: file.size,
      url: `https://${S3_BUCKET_NAME}.s3.amazonaws.com/documents/${fileName}`,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
} 
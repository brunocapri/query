import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { DetectDocumentTextCommand, Block } from '@aws-sdk/client-textract';
import { s3Client, textractClient, S3_BUCKET_NAME, validateS3Config } from '@/utils/s3';
import { v4 as uuidv4 } from 'uuid';
import { chunkDocument } from '@/utils/openai';

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

    // Call Textract to get the text from the files
    console.log("Textract started");
    const extractedText = await extractTextFromImage(buffer);
    console.log("Textract finished");

    console.log("Starting to chunk document")
    const chunks = await chunkDocument(extractedText);

    console.log("Extracted text:", JSON.stringify(chunks, null, 2));

    // Return the file information
    return NextResponse.json({
      success: true,
      fileName: fileName,
      originalName: file.name,
      fileType: file.type,
      fileSize: file.size,
      url: `https://${S3_BUCKET_NAME}.s3.amazonaws.com/documents/${fileName}`,
      extractedText,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
} 


// TODO: we should emit an event and then process the text in the background
async function extractTextFromImage(buffer: Buffer): Promise<string> {
  try {
    const command = new DetectDocumentTextCommand({
      Document: {
        Bytes: buffer
      }
    });

    const response = await textractClient.send(command);
    
    const blockMap = new Map<string, Block>();
    response.Blocks?.forEach(block => {
      if (block.Id) {
        blockMap.set(block.Id, block);
      }
    });

    let output = '';
    
    const pages = response.Blocks?.filter(block => block.BlockType === 'PAGE') || [];
    
    for (const page of pages) {
      if (!page.Relationships) continue;
      
      const childBlocks = page.Relationships
        .filter(rel => rel.Type === 'CHILD')
        .flatMap(rel => rel.Ids || [])
        .map(id => blockMap.get(id))
        .filter((block): block is Block => block !== undefined);

      childBlocks.sort((a, b) => {
        const aTop = a.Geometry?.BoundingBox?.Top || 0;
        const bTop = b.Geometry?.BoundingBox?.Top || 0;
        return aTop - bTop;
      });

      const lineThreshold = 0.01;
      let currentLine: Block[] = [];
      let currentTop = 0;

      for (const block of childBlocks) {
        const blockTop = block.Geometry?.BoundingBox?.Top || 0;
        
        if (currentLine.length === 0 || Math.abs(blockTop - currentTop) <= lineThreshold) {
          currentLine.push(block);
        } else {
          currentLine.sort((a, b) => {
            const aLeft = a.Geometry?.BoundingBox?.Left || 0;
            const bLeft = b.Geometry?.BoundingBox?.Left || 0;
            return aLeft - bLeft;
          });

          output += currentLine
            .map(b => b.Text)
            .filter(text => text)
            .join(' ') + '\n';

          currentLine = [block];
        }
        currentTop = blockTop;
      }

      if (currentLine.length > 0) {
        currentLine.sort((a, b) => {
          const aLeft = a.Geometry?.BoundingBox?.Left || 0;
          const bLeft = b.Geometry?.BoundingBox?.Left || 0;
          return aLeft - bLeft;
        });
        output += currentLine
          .map(b => b.Text)
          .filter(text => text)
          .join(' ') + '\n';
      }

      if (pages.length > 1) {
        output += '\n--- Page Break ---\n\n';
      }
    }

    return output.trim();
  } catch (error) {
    console.error('Error extracting text from image:', error);
    throw error;
  }
}

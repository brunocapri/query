
// 1. 

export type Document = {
  id: string;
  fileName: string;
  fileType: string;
  rawText: string;
  metadata: DocumentMetadata;
  chunks: Chunk[];
}

export type DocumentMetadata = {
  createdAt: Date;
  fileSize: number;
  mimeType: string;
  pageCount?: number;
  totalTokenCount: number;
}

export type Chunk = {
  id: string;
  text: string;
  embedding: number[];
  location: ChunkLocation;
  metadata: ChunkMetadata;
  relationships: ChunkRelationship[];
}

export type ChunkLocation = {
  startIndex: number;
  endIndex: number;
  pageNumber?: number;
  cellReference?: string;
}

export type ChunkMetadata = {
  tokenCount: number;
  languageCode?: string; // ?
  confidence: number;
  topics?: string[];
  entities?: ExtractedEntity[];
  temporalContext?: {
    period?: string;
    dateReferences?: Date[];
  };
  numericalValues?: {
    values: number[];
    unit?: string;
    type: 'currency' | 'percentage' | 'quantity' | 'other';
  };
  sourceDocument: {
    id: string;
    fileName: string;
    mimeType: string;
  };

  contextMaps: 
    {
      domain: string;
      confidence: number;
      fieldMappings: {
        [key: string]: {
          detectedValue: unknown;
          contextTerms: string[];
          confidence: number;
        }[];
      };
    }[];
}


const contextMapExample = {
  domain: 'sales',
  fieldMappings: {
    sales_person: [
      {
        detectedValue: 'John Smith',
        context_terms: ["employee"],
        confidence: 0.95,
      }
    ]
  }
}

export type ChunkRelationship = {
  previousChunk?: string;
  nextChunk?: string;

  parentChunk?: string;
  childChunks?: string[];

  relatedChunks: {
    chunkId: string;
    relationType: 'supports' | 'contradicts' | 'elaborates' | 'references';
    confidence: number;
  }[];
}

export type ExtractedEntity = {}

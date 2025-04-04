import OpenAI from 'openai';

// Initialize OpenAI client
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});



// TODO prevent prompt injection
const CHUNKING_PROMPT = `You are a document analyzer specialized in extracting structured information from text.
Given the following text, create chunks with context maps that help identify queryable fields.
Focus on identifying:
1. Entities (people, products, organizations)
2. Numerical values with their context
3. Dates and temporal information
4. Relationships between entities

Return the chunks as a JSON array where each chunk has:
- text: The original text segment
- values: Extracted and normalized numerical values
- entities: Identified entities with their roles
- dates: Temporal information
- context_map: Field mappings for querying

Example input:
"TABLE JOHN $500 02/03"

RETURN ONLY THE JSON OUTPUT, NO OTHER TEXT.

Example output:
{
  "chunks": [{
    "text": "TABLE JOHN $500 02/03",
    "values": [{
      "value": 500,
      "type": "currency",
      "unit": "USD",
      "context": "item_price"
    }],
    "entities": [
      {
        "text": "JOHN",
        "type": "person",
        "role": "sales_person"
      },
      {
        "text": "TABLE",
        "type": "product",
        "category": "furniture"
      }
    ],
    "dates": [{
      "date": "2024-02-03",
      "type": "transaction_date"
    }],
    "context_map": {
      "domain": "sales",
      "confidence": 0.98,
      "field_mappings": {
        "product": [{
          "detected_value": "TABLE",
          "context_terms": ["item", "furniture", "product"],
          "confidence": 0.95
        }],
        "sales_person": [{
          "detected_value": "JOHN",
          "context_terms": ["responsible", "seller"],
          "confidence": 0.96
        }],
        "sale_amount": [{
          "detected_value": 500,
          "context_terms": ["price", "amount"],
          "confidence": 0.99
        }]
      }
    }
  }]
}`;

export interface DocumentChunk {
  text: string;
  values: {
    value: number;
    type: string;
    unit: string;
    context: string;
  }[];
  entities: {
    text: string;
    type: string;
    role: string;
  }[];
  dates: {
    date: string;
    type: string;
  }[];
  context_map: {
    domain: string;
    confidence: number;
    field_mappings: {
      [key: string]: {
        detected_value: unknown;
        context_terms: string[];
        confidence: number;
      }[];
    };
  };
}

export async function chunkDocument(text: string): Promise<DocumentChunk[]> {
  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: CHUNKING_PROMPT 
        },
        { 
          role: "user", 
          content: text 
        }
      ],
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.1, // Low temperature for consistent output
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    const parsedResponse = JSON.parse(response);
    return parsedResponse.chunks;
  } catch (error) {
    console.error('Error in chunkDocument:', error);
    throw error;
  }
} 
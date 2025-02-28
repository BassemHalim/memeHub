export type MemeSize = "small" | "medium" | "large";

export interface Meme {
    id: string;
    media_url: string;
    media_type: string;
    tags: string[];
    name: string;
    dimensions: number[];
}


export interface MemesResponse {
    memes: Meme[];
    total_count: number;
    page: number;
    total_pages: number;
}


import { JSONSchemaType } from 'ajv';

// Schema for the Meme interface
const memeSchema: JSONSchemaType<Meme> = {
    type: 'object',
    properties: {
      id: { type: 'string' },
      media_url: { type: 'string' },
      media_type: { type: 'string' },
      tags: { 
        type: 'array',
        items: { type: 'string' }
      },
      name: { type: 'string' },
      dimensions: { 
        type: 'array',
        items: { type: 'number' }
      }
    },
    required: ['id', 'media_url', 'media_type', 'tags', 'name', 'dimensions'],
    additionalProperties: false
  };
  
  // Schema for the MemesResponse interface
export const memesResponseSchema: JSONSchemaType<MemesResponse> = {
    type: 'object',
    properties: {
      memes: {
        type: 'array',
        items: memeSchema
      },
      total_count: { type: 'number' },
      page: { type: 'number' },
      total_pages: { type: 'number' }
    },
    required: ['memes', 'total_count', 'page', 'total_pages'],
    additionalProperties: false
  };
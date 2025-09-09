import type { Request, Response } from "express";
import { ImageAnnotatorClient } from "@google-cloud/vision";

interface OCRRequest {
  storagePath: string;
}

interface OCRResponse {
  text: string;
  classification: 'Homework' | 'Flyer' | 'Permission Slip' | 'Report Card' | 'Other';
  extracted: {
    due_date?: string;
    event_date?: string;
    teacher?: string;
    subject?: string;
  };
  suggestedTags: string[];
}

// Initialize Google Cloud Vision client
const visionClient = new ImageAnnotatorClient({
  apiKey: process.env.GOOGLE_VISION_API_KEY,
});

export async function processOCRRequest(req: Request, res: Response) {
  try {
    // Verify authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Missing or invalid authorization header" });
    }

    const { storagePath } = req.body as OCRRequest;
    if (!storagePath) {
      return res.status(400).json({ message: "Missing storagePath in request body" });
    }

    // TODO: Validate Supabase JWT token here
    // For now, we'll assume the token is valid if present

    // Get the image URL from Supabase storage
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const bucketName = process.env.SUPABASE_BUCKET || 'documents';
    
    if (!supabaseUrl) {
      throw new Error("SUPABASE_URL not configured");
    }

    const imageUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${storagePath}`;

    // Process image with Google Cloud Vision
    const [result] = await visionClient.textDetection({
      image: { source: { imageUri: imageUrl } }
    });

    const detections = result.textAnnotations;
    const extractedText = detections?.[0]?.description || '';

    if (!extractedText) {
      return res.json({
        text: '',
        classification: 'Other' as const,
        extracted: {},
        suggestedTags: []
      });
    }

    // Process the extracted text
    const classification = classifyDocument(extractedText);
    const extracted = extractMetadata(extractedText);
    const suggestedTags = generateSuggestedTags(extractedText, classification, extracted.teacher, extracted.subject);

    const response: OCRResponse = {
      text: extractedText,
      classification,
      extracted,
      suggestedTags
    };

    res.json(response);

  } catch (error) {
    console.error("OCR processing error:", error);
    
    if (error instanceof Error && error.message.includes('API key')) {
      return res.status(500).json({ 
        message: "OCR service configuration error",
        error: "Google Vision API key is missing or invalid"
      });
    }

    res.status(500).json({ 
      message: "Failed to process OCR",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

function classifyDocument(text: string): 'Homework' | 'Flyer' | 'Permission Slip' | 'Report Card' | 'Other' {
  const lowerText = text.toLowerCase();
  
  if (/permission\s*slip/i.test(lowerText)) {
    return 'Permission Slip';
  }
  
  if (/(report\s*card|grade|gpa)/i.test(lowerText)) {
    return 'Report Card';
  }
  
  if (/(homework|worksheet|assignment)/i.test(lowerText)) {
    return 'Homework';
  }
  
  if (/(field trip|pta|fair|event|flyer)/i.test(lowerText)) {
    return 'Flyer';
  }
  
  return 'Other';
}

function extractMetadata(text: string): { due_date?: string; event_date?: string; teacher?: string; subject?: string } {
  const result: { due_date?: string; event_date?: string; teacher?: string; subject?: string } = {};
  
  // Extract dates
  const datePatterns = [
    /(\d{1,2}\/\d{1,2}\/\d{4})/g,
    /(\d{1,2}\/\d{1,2}\/\d{2})/g,
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}/gi,
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2},?\s+\d{4}/gi,
  ];
  
  const dates: string[] = [];
  datePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      dates.push(...matches);
    }
  });
  
  // Look for due date context
  const duePattern = /(due|return\s+by|submit\s+by)[\s:]*([^.\n]+)/gi;
  const dueMatch = text.match(duePattern);
  if (dueMatch && dates.length > 0) {
    result.due_date = formatDate(dates[0]);
  }
  
  // Look for event date context
  const eventPattern = /(event|meet|pta|concert|performance|trip)[\s:]*([^.\n]+)/gi;
  const eventMatch = text.match(eventPattern);
  if (eventMatch && dates.length > 0) {
    result.event_date = formatDate(dates[0]);
  }
  
  // If no specific context, use first date based on classification
  if (!result.due_date && !result.event_date && dates.length > 0) {
    const classification = classifyDocument(text);
    if (classification === 'Homework') {
      result.due_date = formatDate(dates[0]);
    } else if (classification === 'Flyer') {
      result.event_date = formatDate(dates[0]);
    }
  }
  
  // Extract teacher
  const teacherPatterns = [
    /teacher[\s:]+([^\n.]+)/gi,
    /(ms\.|mr\.|mrs\.|mx\.)\s+([a-z]+)/gi,
  ];
  
  for (const pattern of teacherPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.teacher = match[0].trim();
      break;
    }
  }
  
  // Extract subject
  const subjects = ['math', 'reading', 'writing', 'science', 'social studies', 'art', 'music', 'pe', 'english'];
  const lowerText = text.toLowerCase();
  
  const subjectPattern = /subject[\s:]+([^\n.]+)/gi;
  const subjectMatch = text.match(subjectPattern);
  if (subjectMatch) {
    result.subject = subjectMatch[0].replace(/subject[\s:]*/gi, '').trim();
  } else {
    for (const subject of subjects) {
      if (lowerText.includes(subject)) {
        result.subject = subject.charAt(0).toUpperCase() + subject.slice(1);
        break;
      }
    }
  }
  
  return result;
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return dateStr;
    }
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  } catch {
    return dateStr;
  }
}

function generateSuggestedTags(text: string, classification: string, teacher?: string, subject?: string): string[] {
  const tags: string[] = [];
  
  // Add classification as tag
  tags.push(classification.toLowerCase());
  
  // Add subject if found
  if (subject) {
    tags.push(subject.toLowerCase());
  }
  
  // Add teacher last name if found
  if (teacher) {
    const lastNameMatch = teacher.match(/([a-z]+)$/i);
    if (lastNameMatch) {
      tags.push(lastNameMatch[1].toLowerCase());
    }
  }
  
  // Add common school keywords
  const keywords = ['pta', 'field trip', 'homework', 'test', 'quiz', 'project', 'assignment'];
  const lowerText = text.toLowerCase();
  
  keywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      tags.push(keyword.replace(' ', '-'));
    }
  });
  
  // Extract grade level
  const gradeMatch = text.match(/(\d+)(st|nd|rd|th)\s+grade/i);
  if (gradeMatch) {
    tags.push(`${gradeMatch[1]}${gradeMatch[2]}-grade`);
  }
  
  return Array.from(new Set(tags)); // Remove duplicates
}

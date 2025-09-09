import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

export interface AIClassificationResult {
  classification: 'Homework' | 'Permission Slip' | 'Flyer' | 'Report Card' | 'Other';
  confidence: number;
  extracted: {
    due_date?: string;
    event_date?: string;
    teacher?: string;
    subject?: string;
    grade_level?: string;
    school_name?: string;
    urgency?: 'low' | 'medium' | 'high';
  };
  suggestedTags: string[];
  summary: string;
}

export async function classifyDocumentWithAI(ocrText: string, enhancedContext?: {
  ocrText: string;
  detectedObjects: Array<{name: string, confidence: number}>;
  semanticTags: string[];
  imageDescription: string;
}): Promise<AIClassificationResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  // Build enhanced prompt with object detection data
  let contextInfo = '';
  if (enhancedContext) {
    contextInfo = `

ENHANCED CONTEXT FROM IMAGE ANALYSIS:
- Detected Objects: ${enhancedContext.detectedObjects.map(obj => `${obj.name} (${Math.round(obj.confidence * 100)}%)`).join(', ')}
- Visual Tags: ${enhancedContext.semanticTags.join(', ')}
- Image Description: "${enhancedContext.imageDescription}"

Use this visual context to enhance your analysis and generate comprehensive semantic tags.`;
  }

  const prompt = `
You are an expert at analyzing school documents. Analyze the following text extracted from a school document and provide detailed classification and metadata extraction.

Document Text:
"${ocrText}"${contextInfo}

Please analyze this document and respond with JSON in exactly this format:
{
  "classification": "one of: Homework, Permission Slip, Flyer, Report Card, Other",
  "confidence": "number between 0 and 1 indicating how confident you are in the classification",
  "extracted": {
    "due_date": "ISO date string if a due date is mentioned (YYYY-MM-DD format)",
    "event_date": "ISO date string if an event date is mentioned (YYYY-MM-DD format)", 
    "teacher": "teacher name if mentioned",
    "subject": "subject area if mentioned (Math, Science, English, etc.)",
    "grade_level": "grade level if mentioned (K, 1st, 2nd, etc.)",
    "school_name": "school name if mentioned",
    "urgency": "low, medium, or high based on language used"
  },
  "suggestedTags": "array of 3-8 relevant tags based on content AND visual elements - include semantic concepts like 'sweet', 'dessert', 'cake', 'food' if detected in image",
  "summary": "brief 1-2 sentence summary of what this document is about"
}

Classification Guidelines:
- Homework: Assignments, worksheets, practice problems, projects with due dates
- Permission Slip: Forms requiring parent signature for field trips, activities, medical forms
- Flyer: Announcements, event notifications, fundraising info, newsletters, including food-related events
- Report Card: Grades, progress reports, academic assessments
- Other: Anything that doesn't clearly fit the above categories

SEMANTIC TAG GENERATION:
- Include visual object tags (e.g., "cake", "food", "dessert")
- Add semantic concept tags (e.g., "sweet", "birthday", "celebration")
- Consider contextual meanings (e.g., "coconut" + "cake" = "tropical", "sweet treat")
- Include text-based tags from OCR content
- Generate searchable terms that parents might use

Extract dates carefully - look for various formats like "due 3/15", "March 15th", "by Friday", etc.
For urgency, consider words like "urgent", "ASAP", "deadline", "important", "reminder".
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a document classification expert specializing in school documents. Always respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1, // Low temperature for consistent classification
      max_tokens: 1000,
    });

    const result = response.choices[0].message.content;
    if (!result) {
      throw new Error("No response from OpenAI");
    }

    const parsed = JSON.parse(result) as AIClassificationResult;
    
    // Validate the response
    if (!parsed.classification || !parsed.confidence || !parsed.suggestedTags || !parsed.summary) {
      throw new Error("Invalid response format from OpenAI");
    }

    // Ensure confidence is between 0 and 1
    parsed.confidence = Math.max(0, Math.min(1, parsed.confidence));

    // Ensure we have a valid classification
    const validClassifications = ['Homework', 'Permission Slip', 'Flyer', 'Report Card', 'Other'];
    if (!validClassifications.includes(parsed.classification)) {
      parsed.classification = 'Other';
    }

    return parsed;

  } catch (error) {
    console.error("AI Classification error:", error);
    
    // Fallback to basic classification if AI fails
    return fallbackClassification(ocrText);
  }
}

function fallbackClassification(text: string): AIClassificationResult {
  const lowerText = text.toLowerCase();
  
  let classification: AIClassificationResult['classification'] = 'Other';
  let confidence = 0.3; // Low confidence for fallback
  
  // Basic fallback classification
  if (lowerText.includes('homework') || lowerText.includes('assignment') || lowerText.includes('due')) {
    classification = 'Homework';
    confidence = 0.6;
  } else if (lowerText.includes('permission') || lowerText.includes('field trip') || lowerText.includes('consent')) {
    classification = 'Permission Slip';
    confidence = 0.6;
  } else if (lowerText.includes('report card') || lowerText.includes('grades') || lowerText.includes('semester')) {
    classification = 'Report Card';
    confidence = 0.6;
  } else if (lowerText.includes('event') || lowerText.includes('fundraiser') || lowerText.includes('announcement')) {
    classification = 'Flyer';
    confidence = 0.6;
  }

  return {
    classification,
    confidence,
    extracted: {},
    suggestedTags: ['document'],
    summary: "Document classification unavailable - basic analysis used."
  };
}

export async function enhanceMetadataWithAI(
  ocrText: string, 
  currentMetadata: any
): Promise<{
  enhancedMetadata: any;
  additionalInsights: string[];
}> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      enhancedMetadata: currentMetadata,
      additionalInsights: []
    };
  }

  const prompt = `
Given this school document text and existing metadata, enhance and correct the metadata:

Document Text:
"${ocrText}"

Current Metadata:
${JSON.stringify(currentMetadata, null, 2)}

Please analyze and provide enhanced metadata in JSON format:
{
  "enhancedMetadata": {
    "title": "better title if current one can be improved",
    "teacher": "teacher name if found or improved",
    "subject": "subject area if found or improved", 
    "due_date": "ISO date if found or corrected",
    "event_date": "ISO date if found or corrected",
    "grade_level": "grade level if determinable",
    "urgency": "low/medium/high based on language",
    "action_required": "true/false if parent action needed",
    "additional_tags": "array of additional relevant tags"
  },
  "additionalInsights": [
    "array of helpful insights about this document"
  ]
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system", 
          content: "You are a metadata enhancement expert for school documents. Provide accurate, helpful metadata improvements."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 800,
    });

    const result = response.choices[0].message.content;
    if (!result) {
      throw new Error("No response from OpenAI");
    }

    return JSON.parse(result);

  } catch (error) {
    console.error("AI Metadata Enhancement error:", error);
    return {
      enhancedMetadata: currentMetadata,
      additionalInsights: []
    };
  }
}
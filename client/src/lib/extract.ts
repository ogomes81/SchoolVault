export const classifyDocument = (text: string): 'Homework' | 'Flyer' | 'Permission Slip' | 'Report Card' | 'Other' => {
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
};

export const extractDates = (text: string): { due_date?: string; event_date?: string } => {
  const result: { due_date?: string; event_date?: string } = {};
  
  // Date patterns
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
    result.due_date = dates[0];
  }
  
  // Look for event date context
  const eventPattern = /(event|meet|pta|concert|performance|trip)[\s:]*([^.\n]+)/gi;
  const eventMatch = text.match(eventPattern);
  if (eventMatch && dates.length > 0) {
    result.event_date = dates[0];
  }
  
  // If no specific context, use first date as due date for homework/assignments
  if (!result.due_date && !result.event_date && dates.length > 0) {
    const classification = classifyDocument(text);
    if (classification === 'Homework') {
      result.due_date = dates[0];
    } else if (classification === 'Flyer') {
      result.event_date = dates[0];
    }
  }
  
  return result;
};

export const extractTeacher = (text: string): string | undefined => {
  // Look for teacher patterns
  const teacherPatterns = [
    /teacher[\s:]+([^\n.]+)/gi,
    /(ms\.|mr\.|mrs\.|mx\.)\s+([a-z]+)/gi,
  ];
  
  for (const pattern of teacherPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }
  
  return undefined;
};

export const extractSubject = (text: string): string | undefined => {
  const subjects = ['math', 'reading', 'writing', 'science', 'social studies', 'art', 'music', 'pe', 'english'];
  const lowerText = text.toLowerCase();
  
  // Look for explicit subject mention
  const subjectPattern = /subject[\s:]+([^\n.]+)/gi;
  const subjectMatch = text.match(subjectPattern);
  if (subjectMatch) {
    return subjectMatch[0].replace(/subject[\s:]*/gi, '').trim();
  }
  
  // Look for known subjects
  for (const subject of subjects) {
    if (lowerText.includes(subject)) {
      return subject.charAt(0).toUpperCase() + subject.slice(1);
    }
  }
  
  return undefined;
};

export const generateSuggestedTags = (text: string, classification: string, teacher?: string, subject?: string): string[] => {
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
};

import { apiRequest } from './queryClient';
import { getAuthHeaders } from './supabase';

export interface OCRResponse {
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

export const processOCR = async (storagePath: string): Promise<OCRResponse> => {
  const headers = await getAuthHeaders();
  
  const authResponse = await fetch('/api/ocr', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({ storagePath }),
  });
  
  if (!authResponse.ok) {
    throw new Error(`OCR processing failed: ${authResponse.statusText}`);
  }
  
  return authResponse.json();
};

export const generateShareToken = (): string => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

export const generateICS = (title: string, date: string, description?: string): string => {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  const eventDate = new Date(date);
  const dateStr = eventDate.toISOString().slice(0, 10).replace(/-/g, '');
  
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SchoolVault//EN',
    'BEGIN:VEVENT',
    `UID:${timestamp}-schoolvault`,
    `DTSTAMP:${timestamp}`,
    `DTSTART;VALUE=DATE:${dateStr}`,
    `SUMMARY:${title}`,
    description ? `DESCRIPTION:${description.slice(0, 160)}` : '',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean).join('\r\n');
  
  return icsContent;
};

export const downloadICS = (content: string, filename: string = 'schoolvault-event.ics') => {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

export const generateICSContent = (title: string, date: string, description?: string): string => {
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

export const downloadICSFile = (content: string, filename: string = 'schoolvault-event.ics') => {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  GraduationCap, 
  Download, 
  Calendar, 
  User, 
  BookOpen, 
  Presentation,
  Tag,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { getDocumentUrl } from '@/lib/supabase';
import { generateICS, downloadICS } from '@/lib/api';
import type { Document, Child } from '@shared/schema';

interface SharedDocument extends Document {
  child?: Child;
}

export default function PublicSharePage() {
  const { token } = useParams();
  const { toast } = useToast();

  // Fetch shared document
  const { data: document, isLoading, error } = useQuery<SharedDocument>({
    queryKey: ['/api/shared', token],
    enabled: !!token,
  });

  const handleDownloadImage = () => {
    if (!document) return;
    
    const imageUrl = getDocumentUrl(document.storagePath);
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${document.title}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Download started",
      description: "The document image is being downloaded.",
    });
  };

  const handleExportCalendar = () => {
    if (!document) return;
    
    const date = document.dueDate || document.eventDate;
    if (!date) return;
    
    const icsContent = generateICS(
      document.title,
      date,
      document.ocrText?.slice(0, 160)
    );
    
    downloadICS(icsContent, `${document.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.ics`);
    
    toast({
      title: "Calendar event exported",
      description: "The event has been downloaded as an .ics file.",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading shared document...</p>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-8 h-8 text-muted-foreground" />
            </div>
            <h1 className="text-xl font-bold mb-2">Document not found</h1>
            <p className="text-muted-foreground mb-4">
              This shared document link is invalid or has been revoked.
            </p>
            <Button asChild>
              <a href="https://schoolvault.app" className="inline-flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                Get SchoolVault
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const imageUrl = getDocumentUrl(document.storagePath);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">SchoolVault</h1>
          <p className="text-muted-foreground">Shared Document</p>
        </div>

        {/* Document Card */}
        <Card className="max-w-2xl mx-auto">
          <div className="aspect-video bg-muted">
            <img 
              src={imageUrl} 
              alt={document.title}
              className="w-full h-full object-cover"
              data-testid="img-shared-document"
            />
          </div>
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-card-foreground mb-4" data-testid="text-document-title">
              {document.title}
            </h2>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="font-medium">Student:</span>{' '}
                  <span data-testid="text-student-name">{document.child?.name || 'Unknown'}</span>
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                <Tag className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="font-medium">Type:</span>{' '}
                  <span data-testid="text-doc-type">{document.docType}</span>
                </span>
              </div>
              
              {document.dueDate && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="font-medium">Due Date:</span>{' '}
                    <span data-testid="text-due-date">
                      {format(new Date(document.dueDate), 'MMMM d, yyyy')}
                    </span>
                  </span>
                </div>
              )}
              
              {document.eventDate && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="font-medium">Event Date:</span>{' '}
                    <span data-testid="text-event-date">
                      {format(new Date(document.eventDate), 'MMMM d, yyyy')}
                    </span>
                  </span>
                </div>
              )}
              
              {document.teacher && (
                <div className="flex items-center gap-3">
                  <Presentation className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="font-medium">Teacher:</span>{' '}
                    <span data-testid="text-teacher">{document.teacher}</span>
                  </span>
                </div>
              )}
              
              {document.subject && (
                <div className="flex items-center gap-3">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="font-medium">Subject:</span>{' '}
                    <span data-testid="text-subject">{document.subject}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Tags */}
            {document.tags && Array.isArray(document.tags) && document.tags.length > 0 && (
              <div className="mb-6">
                <p className="text-sm font-medium text-card-foreground mb-2">Tags:</p>
                <div className="flex flex-wrap gap-2">
                  {(document.tags as string[]).map((tag, index) => (
                    <Badge key={index} variant="outline" data-testid={`tag-${index}`}>
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button onClick={handleDownloadImage} className="flex-1" data-testid="button-download-image">
                <Download className="w-4 h-4 mr-2" />
                Download Image
              </Button>
              {(document.dueDate || document.eventDate) && (
                <Button variant="secondary" onClick={handleExportCalendar} data-testid="button-add-calendar">
                  <Calendar className="w-4 h-4 mr-2" />
                  Add to Calendar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-muted-foreground text-sm mb-4">Powered by</p>
          <div className="flex items-center justify-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">SchoolVault</span>
          </div>
          <p className="text-muted-foreground text-sm mt-2">
            <a 
              href="https://schoolvault.app" 
              className="text-primary hover:underline inline-flex items-center gap-1"
              data-testid="link-get-schoolvault"
            >
              Get SchoolVault for your family
              <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

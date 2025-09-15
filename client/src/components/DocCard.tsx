import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Share, User, Clock } from 'lucide-react';
import { format } from 'date-fns';
import type { Document, Child } from '@shared/schema';
import { getDocumentUrl } from '@/lib/supabase';

interface DocCardProps {
  document: Document & { child?: Child };
  onDocumentClick: (id: string, useGallery?: boolean, initialPage?: number) => void;
  onShare: (id: string) => void;
  onExportCalendar: (id: string) => void;
}

const getDocTypeColor = (docType: string) => {
  switch (docType) {
    case 'Homework':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'Permission Slip':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'Flyer':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'Report Card':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
};

const getDueDateColor = (dueDate: string | null) => {
  if (!dueDate) return '';
  
  const due = new Date(dueDate);
  const now = new Date();
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  if (diffDays <= 1) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
  if (diffDays <= 7) return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
  return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
};

export default function DocCard({ document, onDocumentClick, onShare, onExportCalendar }: DocCardProps) {
  // Parse pages data to check if it's multi-page
  const raw = (document as any)?.pages;
  let parsed: string[] = Array.isArray(raw) 
    ? raw 
    : (typeof raw === 'string' 
      ? (() => { try { return JSON.parse(raw); } catch { return []; } })()
      : []);
  const pages = parsed.length ? parsed : [document.storagePath];
  const isMultiPage = pages.length > 1;
  
  const imageUrl = getDocumentUrl(document.storagePath);
  
  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // All documents go to detail page (both single and multi-page)
    onDocumentClick(document.id, false);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShare(document.id);
  };

  const handleExportCalendar = (e: React.MouseEvent) => {
    e.stopPropagation();
    onExportCalendar(document.id);
  };

  return (
    <Card 
      className="document-card overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
      onClick={handleCardClick}
      data-testid={`card-document-${document.id}`}
    >
      <div className="aspect-video relative overflow-hidden bg-muted">
        <img 
          src={imageUrl} 
          alt={document.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xODAgMTUwTDIyMCAxMTBMMjYwIDE1MEwyMjAgMTkwWiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K';
          }}
        />
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          <Badge className={getDocTypeColor(document.docType)}>
            {document.docType}
          </Badge>
          {document.status === 'processing' && (
            <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 animate-pulse">
              Processing...
            </Badge>
          )}
          {document.status === 'failed' && (
            <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
              Failed
            </Badge>
          )}
        </div>
        <div className="absolute top-3 right-3 flex gap-1">
          {/* Multi-page indicator */}
          {document.pages && Array.isArray(document.pages) && document.pages.length > 1 && (
            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
              📄 {document.pages.length} pages
            </Badge>
          )}
          {document.dueDate && (
            <Badge className={getDueDateColor(document.dueDate)}>
              Due {format(new Date(document.dueDate), 'MMM d')}
            </Badge>
          )}
          {document.eventDate && (
            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {format(new Date(document.eventDate), 'MMM d')}
            </Badge>
          )}
          {document.isShared && (
            <Badge variant="secondary">
              <Share className="w-3 h-3" />
            </Badge>
          )}
        </div>
      </div>
      
      <CardContent className="p-4">
        <h3 className="font-semibold text-card-foreground mb-2 line-clamp-2" data-testid={`text-title-${document.id}`}>
          {document.title}
        </h3>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <User className="w-4 h-4" />
          <span data-testid={`text-child-${document.id}`}>
            {document.child?.name || 'Unknown Child'}
          </span>
          {document.subject && (
            <>
              <span>•</span>
              <span data-testid={`text-subject-${document.id}`}>{document.subject}</span>
            </>
          )}
          {document.teacher && (
            <>
              <span>•</span>
              <span data-testid={`text-teacher-${document.id}`}>{document.teacher}</span>
            </>
          )}
        </div>
        
        {document.tags && Array.isArray(document.tags) && document.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {(document.tags as string[]).slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {(document.tags as string[]).length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{(document.tags as string[]).length - 3} more
              </Badge>
            )}
          </div>
        )}
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {format(new Date(document.createdAt), 'MMM d, yyyy')}
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              data-testid={`button-share-${document.id}`}
            >
              <Share className="w-4 h-4" />
            </Button>
            {(document.dueDate || document.eventDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExportCalendar}
                data-testid={`button-calendar-${document.id}`}
              >
                <Calendar className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

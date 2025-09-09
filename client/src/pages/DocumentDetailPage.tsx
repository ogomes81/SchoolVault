import { useState } from 'react';
import * as React from 'react';
import { useLocation, useParams } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import TagInput from '@/components/TagInput';
import DateField from '@/components/DateField';
import { 
  ArrowLeft, 
  Share, 
  Calendar, 
  Download, 
  Trash2, 
  ChevronRight,
  Copy,
  ZoomIn,
  GraduationCap,
  User,
  BookOpen,
  Calendar as CalendarIcon,
  Presentation
} from 'lucide-react';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import { getDocumentUrl } from '@/lib/supabase';
import { generateShareToken, downloadICS, generateICS } from '@/lib/api';
import type { Document, Child } from '@shared/schema';

interface DocumentWithChild extends Document {
  child?: Child;
}

export default function DocumentDetailPage() {
  const { user, loading: authLoading } = useAuthGuard();
  const [, navigate] = useLocation();
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isOCRExpanded, setIsOCRExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch document
  const { data: document, isLoading: documentLoading } = useQuery<DocumentWithChild>({
    queryKey: ['/api/documents', id],
    enabled: !!user && !!id,
  });

  // Fetch children for child selector
  const { data: children = [] } = useQuery<Child[]>({
    queryKey: ['/api/children'],
    enabled: !!user,
  });

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    childId: '',
    docType: '',
    dueDate: '',
    eventDate: '',
    teacher: '',
    subject: '',
    tags: [] as string[],
    isShared: false,
  });

  // Initialize form when document loads
  React.useEffect(() => {
    if (document) {
      setFormData({
        title: document.title,
        childId: document.childId || '',
        docType: document.docType,
        dueDate: document.dueDate || '',
        eventDate: document.eventDate || '',
        teacher: document.teacher || '',
        subject: document.subject || '',
        tags: Array.isArray(document.tags) ? document.tags : [],
        isShared: document.isShared || false,
      });
    }
  }, [document]);

  // Update document mutation
  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Document>) => {
      const response = await apiRequest('PATCH', `/api/documents/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      setIsEditing(false);
      toast({
        title: "Document updated",
        description: "Your changes have been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Delete document mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', `/api/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({
        title: "Document deleted",
        description: "The document has been removed.",
      });
      navigate('/app');
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const updates: Partial<Document> = {
      title: formData.title,
      childId: formData.childId || null,
      docType: formData.docType,
      dueDate: formData.dueDate || null,
      eventDate: formData.eventDate || null,
      teacher: formData.teacher || null,
      subject: formData.subject || null,
      tags: formData.tags,
    };
    
    updateMutation.mutate(updates);
  };

  const handleToggleSharing = () => {
    const newIsShared = !formData.isShared;
    const shareToken = newIsShared ? generateShareToken() : null;
    
    updateMutation.mutate({
      isShared: newIsShared,
      shareToken,
    });
    
    setFormData(prev => ({ ...prev, isShared: newIsShared }));
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

  const handleCopyShareLink = () => {
    if (!document?.shareToken) return;
    
    const shareUrl = `${window.location.origin}/s/${document.shareToken}`;
    navigator.clipboard.writeText(shareUrl);
    
    toast({
      title: "Link copied",
      description: "Share link has been copied to clipboard.",
    });
  };

  const handleDownloadImage = () => {
    if (!document) return;
    
    const imageUrl = getDocumentUrl(document.storagePath);
    const link = window.document.createElement('a');
    link.href = imageUrl;
    link.download = `${document.title}.jpg`;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      deleteMutation.mutate();
    }
  };

  if (authLoading || documentLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !document) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <h1 className="text-xl font-bold mb-2">Document not found</h1>
            <p className="text-muted-foreground mb-4">The document you're looking for doesn't exist or you don't have permission to view it.</p>
            <Button onClick={() => navigate('/app')}>Back to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const imageUrl = getDocumentUrl(document.storagePath);
  const shareUrl = document.shareToken ? `${window.location.origin}/s/${document.shareToken}` : '';

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/app')} data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold truncate">{document.title}</h1>
            </div>
            
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleToggleSharing} data-testid="button-toggle-share">
                <Share className="w-4 h-4" />
              </Button>
              {(document.dueDate || document.eventDate) && (
                <Button variant="ghost" size="sm" onClick={handleExportCalendar} data-testid="button-export-calendar">
                  <Calendar className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Document Image */}
          <div className="space-y-4">
            <div className="aspect-video bg-muted rounded-xl overflow-hidden">
              <img 
                src={imageUrl} 
                alt={document.title}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => window.open(imageUrl, '_blank')}
                data-testid="img-document"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDownloadImage} data-testid="button-download">
                <Download className="w-4 h-4 mr-2" />
                Download Original
              </Button>
              <Button variant="outline" onClick={() => window.open(imageUrl, '_blank')} data-testid="button-view-fullsize">
                <ZoomIn className="w-4 h-4 mr-2" />
                View Full Size
              </Button>
            </div>
          </div>

          {/* Document Metadata */}
          <div className="space-y-6">
            {/* Status and Type */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{document.docType}</Badge>
              {document.dueDate && (
                <Badge variant="outline">
                  Due {format(new Date(document.dueDate), 'MMM d, yyyy')}
                </Badge>
              )}
              {document.eventDate && (
                <Badge variant="outline">
                  Event {format(new Date(document.eventDate), 'MMM d, yyyy')}
                </Badge>
              )}
              {document.isShared && (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Shared
                </Badge>
              )}
            </div>

            {/* Document Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <User className="w-4 h-4 text-muted-foreground" />
                <span><span className="font-medium">Student:</span> {document.child?.name || 'Unknown'}</span>
              </div>
              {document.subject && (
                <div className="flex items-center gap-3 text-sm">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                  <span><span className="font-medium">Subject:</span> {document.subject}</span>
                </div>
              )}
              {document.teacher && (
                <div className="flex items-center gap-3 text-sm">
                  <Presentation className="w-4 h-4 text-muted-foreground" />
                  <span><span className="font-medium">Teacher:</span> {document.teacher}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                <span><span className="font-medium">Added:</span> {format(new Date(document.createdAt), 'MMM d, yyyy')}</span>
              </div>
            </div>

            {/* Editable Form */}
            {isEditing ? (
              <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
                <div>
                  <Label htmlFor="edit-title">Title</Label>
                  <Input
                    id="edit-title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    data-testid="input-edit-title"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-child">Child</Label>
                    <Select value={formData.childId} onValueChange={(value) => setFormData(prev => ({ ...prev, childId: value }))}>
                      <SelectTrigger data-testid="select-edit-child">
                        <SelectValue placeholder="Select child" />
                      </SelectTrigger>
                      <SelectContent>
                        {children.map((child) => (
                          <SelectItem key={child.id} value={child.id}>
                            {child.name} ({child.grade})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-doctype">Document Type</Label>
                    <Select value={formData.docType} onValueChange={(value) => setFormData(prev => ({ ...prev, docType: value }))}>
                      <SelectTrigger data-testid="select-edit-doctype">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Homework">Homework</SelectItem>
                        <SelectItem value="Permission Slip">Permission Slip</SelectItem>
                        <SelectItem value="Flyer">Flyer</SelectItem>
                        <SelectItem value="Report Card">Report Card</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <DateField
                    label="Due Date"
                    value={formData.dueDate}
                    onChange={(value) => setFormData(prev => ({ ...prev, dueDate: value }))}
                  />
                  <DateField
                    label="Event Date"
                    value={formData.eventDate}
                    onChange={(value) => setFormData(prev => ({ ...prev, eventDate: value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-teacher">Teacher</Label>
                    <Input
                      id="edit-teacher"
                      value={formData.teacher}
                      onChange={(e) => setFormData(prev => ({ ...prev, teacher: e.target.value }))}
                      data-testid="input-edit-teacher"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-subject">Subject</Label>
                    <Input
                      id="edit-subject"
                      value={formData.subject}
                      onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                      data-testid="input-edit-subject"
                    />
                  </div>
                </div>

                <div>
                  <Label>Tags</Label>
                  <TagInput
                    tags={formData.tags}
                    onTagsChange={(tags) => setFormData(prev => ({ ...prev, tags }))}
                  />
                </div>

                <div className="flex gap-3">
                  <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-changes">
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)} data-testid="button-cancel-edit">
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                {/* Tags Display */}
                {document.tags && Array.isArray(document.tags) && document.tags.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-card-foreground mb-2 block">Tags</Label>
                    <div className="flex flex-wrap gap-2">
                      {(document.tags as string[]).map((tag, index) => (
                        <Badge key={index} variant="outline">{String(tag)}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Button onClick={() => setIsEditing(true)} data-testid="button-edit">
                  Edit Document
                </Button>
              </div>
            )}

            {/* Sharing Controls */}
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-card-foreground">Public Sharing</h4>
                    <p className="text-sm text-muted-foreground">Allow others to view this document with a link</p>
                  </div>
                  <Switch 
                    checked={document.isShared || false} 
                    onCheckedChange={handleToggleSharing}
                    data-testid="switch-sharing"
                  />
                </div>
                {document.isShared && shareUrl && (
                  <div className="mt-3 p-2 bg-background rounded border">
                    <div className="flex items-center gap-2">
                      <Input 
                        value={shareUrl} 
                        readOnly 
                        className="text-sm bg-transparent border-none text-muted-foreground"
                        data-testid="input-share-url"
                      />
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={handleCopyShareLink}
                        data-testid="button-copy-link"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Delete Button */}
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              data-testid="button-delete"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Document'}
            </Button>
          </div>
        </div>

        {/* OCR Text Section */}
        {document.ocrText && (
          <div className="mt-8 pt-6 border-t border-border">
            <Collapsible open={isOCRExpanded} onOpenChange={setIsOCRExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 p-0 h-auto font-medium" data-testid="button-toggle-ocr">
                  <ChevronRight className={`w-4 h-4 transition-transform ${isOCRExpanded ? 'rotate-90' : ''}`} />
                  Extracted Text (OCR)
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap" data-testid="text-ocr-content">
                      {document.ocrText}
                    </p>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </main>
    </div>
  );
}

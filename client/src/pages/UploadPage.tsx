import { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import TagInput from '@/components/TagInput';
import DateField from '@/components/DateField';
import { Camera, Upload, X, FileImage, GraduationCap } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { uploadDocument, getCurrentUser } from '@/lib/supabase';
import { processOCR } from '@/lib/api';
import type { Child, InsertDocument } from '@shared/schema';

export default function UploadPage() {
  const { user, loading: authLoading } = useAuthGuard();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [selectedChildId, setSelectedChildId] = useState('');
  const [docType, setDocType] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [teacher, setTeacher] = useState('');
  const [subject, setSubject] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  // Fetch children
  const { data: children = [] } = useQuery<Child[]>({
    queryKey: ['/api/children'],
    enabled: !!user,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile || !user) {
        throw new Error('No file selected or user not authenticated');
      }

      // Generate unique document ID
      const documentId = crypto.randomUUID();
      
      // Upload file to Supabase Storage
      const storagePath = await uploadDocument(selectedFile, user.id, documentId);
      
      // Create document record
      const documentData: InsertDocument = {
        userId: user.id,
        childId: selectedChildId || null,
        title: title || selectedFile.name,
        docType: docType || 'Other',
        storagePath,
        dueDate: dueDate || null,
        eventDate: eventDate || null,
        teacher: teacher || null,
        subject: subject || null,
        tags: tags,
        ocrText: null,
        isShared: false,
        shareToken: null,
      };

      const response = await apiRequest('POST', '/api/documents', documentData);
      const createdDoc = await response.json();
      
      // Process OCR
      try {
        const ocrResult = await processOCR(storagePath);
        
        // Update document with OCR results
        await apiRequest('PATCH', `/api/documents/${createdDoc.id}`, {
          ocrText: ocrResult.text,
          docType: docType || ocrResult.classification,
          dueDate: dueDate || ocrResult.extracted.due_date || null,
          eventDate: eventDate || ocrResult.extracted.event_date || null,
          teacher: teacher || ocrResult.extracted.teacher || null,
          subject: subject || ocrResult.extracted.subject || null,
          tags: tags.length > 0 ? tags : ocrResult.suggestedTags,
        });
      } catch (ocrError) {
        console.warn('OCR processing failed:', ocrError);
        // Continue without OCR - document is still created
      }
      
      return createdDoc;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({
        title: "Document uploaded successfully",
        description: "Your document has been processed and saved.",
      });
      navigate(`/app/doc/${data.id}`);
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An error occurred during upload",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        
        // Set default title if empty
        if (!title) {
          setTitle(file.name.replace(/\.[^/.]+$/, ''));
        }
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select an image file.",
          variant: "destructive",
        });
      }
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }
    
    if (!selectedChildId && children.length > 0) {
      toast({
        title: "No child selected",
        description: "Please select which child this document belongs to.",
        variant: "destructive",
      });
      return;
    }
    
    uploadMutation.mutate();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold">Upload Document</h1>
            </div>
            <Button variant="ghost" onClick={() => navigate('/app')} data-testid="button-close">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* File Upload Area */}
              {!selectedFile ? (
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary transition-colors">
                  <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Camera className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-card-foreground mb-2">Choose or take a photo</h3>
                  <p className="text-muted-foreground mb-4">Upload worksheets, flyers, permission slips, and more</p>
                  <div className="flex gap-3 justify-center">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="camera-input"
                      data-testid="input-file-camera"
                    />
                    <label htmlFor="camera-input">
                      <Button type="button" asChild data-testid="button-take-photo">
                        <span>
                          <Camera className="w-4 h-4 mr-2" />
                          Take Photo
                        </span>
                      </Button>
                    </label>
                    
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-input"
                      data-testid="input-file-upload"
                    />
                    <label htmlFor="file-input">
                      <Button type="button" variant="secondary" asChild data-testid="button-choose-file">
                        <span>
                          <Upload className="w-4 h-4 mr-2" />
                          Choose File
                        </span>
                      </Button>
                    </label>
                  </div>
                </div>
              ) : (
                /* Preview Area */
                <div className="bg-muted rounded-xl p-4">
                  <div className="flex gap-4">
                    <div className="w-24 h-24 bg-background rounded-lg overflow-hidden flex-shrink-0">
                      {previewUrl && (
                        <img 
                          src={previewUrl} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-card-foreground truncate" data-testid="text-filename">
                        {selectedFile.name}
                      </p>
                      <p className="text-sm text-muted-foreground" data-testid="text-filesize">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <div className="mt-2">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={handleRemoveFile}
                          className="text-destructive hover:text-destructive"
                          data-testid="button-remove-file"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Document Details Form */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Document Title *</Label>
                  <Input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter a title for this document"
                    required
                    data-testid="input-title"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="child">Child *</Label>
                    <Select value={selectedChildId} onValueChange={setSelectedChildId} required>
                      <SelectTrigger data-testid="select-child">
                        <SelectValue placeholder="Select a child" />
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
                    <Label htmlFor="docType">Document Type</Label>
                    <Select value={docType} onValueChange={setDocType}>
                      <SelectTrigger data-testid="select-doc-type">
                        <SelectValue placeholder="Auto-detect" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Auto-detect</SelectItem>
                        <SelectItem value="Homework">Homework</SelectItem>
                        <SelectItem value="Permission Slip">Permission Slip</SelectItem>
                        <SelectItem value="Flyer">Flyer</SelectItem>
                        <SelectItem value="Report Card">Report Card</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DateField
                    label="Due Date"
                    value={dueDate}
                    onChange={setDueDate}
                    placeholder="Optional"
                  />
                  <DateField
                    label="Event Date"
                    value={eventDate}
                    onChange={setEventDate}
                    placeholder="Optional"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="teacher">Teacher</Label>
                    <Input
                      id="teacher"
                      type="text"
                      value={teacher}
                      onChange={(e) => setTeacher(e.target.value)}
                      placeholder="e.g., Ms. Johnson"
                      data-testid="input-teacher"
                    />
                  </div>
                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g., Math, Science"
                      data-testid="input-subject"
                    />
                  </div>
                </div>

                <div>
                  <Label>Tags</Label>
                  <TagInput
                    tags={tags}
                    onTagsChange={setTags}
                    placeholder="Add tags and press Enter"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    e.g., homework, math, chapter-5
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-border">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => navigate('/app')}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={uploadMutation.isPending || !selectedFile}
                  data-testid="button-upload"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    'Upload & Process'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

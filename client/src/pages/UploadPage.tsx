import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { Camera, Upload, X, Check } from 'lucide-react';
import { uploadDocument, getCurrentUser } from '@/lib/supabase';
import { apiRequest } from '@/lib/queryClient';
import type { InsertDocument, Child } from '@shared/schema';

export default function UploadPage() {
  const { user, loading: authLoading } = useAuthGuard();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [showCameraCapture, setShowCameraCapture] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [selectedChild, setSelectedChild] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch children
  const { data: children = [] } = useQuery<Child[]>({
    queryKey: ['/api/children'],
    enabled: !!user,
  });

  // Auto-select first child when children load
  useEffect(() => {
    if (children.length > 0 && !selectedChild) {
      setSelectedChild(children[0].id);
    }
  }, [children, selectedChild]);

  // Upload multiple photos as one document
  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      if (!user || files.length === 0) {
        throw new Error('No files selected or user not authenticated');
      }

      // Generate unique document ID
      const documentId = crypto.randomUUID();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      // Upload each photo
      const storagePaths: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = `${timestamp}-${i + 1}.jpg`;
        const storagePath = await uploadDocument(file, user.id, documentId, fileName);
        storagePaths.push(storagePath);
      }

      // Create document record with first photo as main storage path
      const documentData: InsertDocument = {
        userId: user.id,
        childId: selectedChild || null, // Use selected child
        title: `Document ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
        docType: 'Other',
        storagePath: storagePaths[0], // Main photo
        status: 'processing',
        ocrText: null,
        tags: [],
        dueDate: null,
        eventDate: null,
        teacher: null,
        subject: null,
        isShared: false,
        shareToken: null,
      };

      const response = await apiRequest('POST', '/api/documents', documentData);
      const createdDoc = await response.json();

      // Store additional photos if any (you might want to modify schema for this)
      // For now, we'll use the main photo only
      
      return createdDoc;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({
        title: "✅ Photos Saved!",
        description: "Your document is being processed in the background...",
      });
      
      // Navigate to dashboard
      navigate('/app');
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
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      toast({
        title: "Invalid file type",
        description: "Please select image files only.",
        variant: "destructive",
      });
      return;
    }

    // Process and upload the files immediately
    processImageFiles(imageFiles);
  };

  const processImageFiles = async (files: File[]) => {
    const processedFiles: File[] = [];
    
    for (const file of files) {
      const processedFile = await enhanceImageFile(file);
      processedFiles.push(processedFile);
    }
    
    // Upload all processed files
    uploadMutation.mutate(processedFiles);
  };

  const enhanceImageFile = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        
        // Apply document scanning enhancements
        enhanceDocument(canvas, ctx);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const enhancedFile = new File([blob], file.name, { type: 'image/jpeg' });
            resolve(enhancedFile);
          } else {
            resolve(file);
          }
        }, 'image/jpeg', 0.9);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const enhanceDocument = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D | null) => {
    if (!ctx) return;
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Apply contrast and brightness enhancement for better OCR
    for (let i = 0; i < data.length; i += 4) {
      const contrast = 1.2;
      const brightness = 10;
      
      data[i] = Math.min(255, Math.max(0, (data[i] - 128) * contrast + 128 + brightness));
      data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * contrast + 128 + brightness));
      data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * contrast + 128 + brightness));
    }
    
    ctx.putImageData(imageData, 0, 0);
  };

  const startCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setShowCameraCapture(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera access failed",
        description: "Please allow camera access to take photos.",
        variant: "destructive",
      });
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        
        // Apply document scanning enhancements
        enhanceDocument(canvas, ctx);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        
        // Convert to file and add to captured photos
        canvas.toBlob((blob) => {
          if (blob) {
            const timestamp = Date.now();
            const file = new File([blob], `photo-${timestamp}.jpg`, { type: 'image/jpeg' });
            
            setCapturedPhotos(prev => [...prev, file]);
            setPreviewUrls(prev => [...prev, dataUrl]);
            
            toast({
              title: `📸 Photo ${capturedPhotos.length + 1} captured`,
              description: "Take more photos or save when done",
            });
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setShowCameraCapture(false);
  };

  const removePhoto = (index: number) => {
    setCapturedPhotos(prev => prev.filter((_, i) => i !== index));
    
    // Revoke and remove preview URL
    URL.revokeObjectURL(previewUrls[index]);
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const savePhotos = () => {
    if (capturedPhotos.length === 0) return;
    
    stopCamera();
    uploadMutation.mutate(capturedPhotos);
    
    // Clear captured photos
    setCapturedPhotos([]);
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setPreviewUrls([]);
  };

  if (authLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <main className="max-w-2xl mx-auto pt-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📄 Add Document
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Camera Capture Modal */}
            {showCameraCapture && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-4 max-w-4xl w-full mx-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Take Photos</h3>
                    <Button variant="ghost" size="sm" onClick={stopCamera}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="relative">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full rounded-lg"
                        style={{ maxHeight: '400px' }}
                      />
                      <canvas ref={canvasRef} className="hidden" />
                    </div>
                    
                    {/* Captured photos preview */}
                    {previewUrls.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {previewUrls.map((url, index) => (
                          <div key={index} className="relative flex-shrink-0">
                            <img 
                              src={url} 
                              alt={`Captured ${index + 1}`} 
                              className="w-16 h-16 object-cover rounded border-2 border-green-500"
                            />
                            <button
                              onClick={() => removePhoto(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Button onClick={capturePhoto} className="flex-1">
                        <Camera className="w-4 h-4 mr-2" />
                        Take Photo ({capturedPhotos.length})
                      </Button>
                      
                      {capturedPhotos.length > 0 && (
                        <Button onClick={savePhotos} variant="default" className="flex-1">
                          <Check className="w-4 h-4 mr-2" />
                          Save {capturedPhotos.length} Photo{capturedPhotos.length !== 1 ? 's' : ''}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Main Upload Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* File Upload Option */}
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <div className="mb-4">
                    <Upload className="w-12 h-12 mx-auto text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Upload Files</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select photos from your device
                  </p>
                  <label htmlFor="file-upload">
                    <Button asChild className="w-full" disabled={uploadMutation.isPending}>
                      <span>
                        {uploadMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Uploading...
                          </>
                        ) : (
                          'Choose Files'
                        )}
                      </span>
                    </Button>
                  </label>
                  <input
                    id="file-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    data-testid="input-file-upload"
                  />
                </CardContent>
              </Card>

              {/* Camera Option */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="mb-4">
                    <Camera className="w-12 h-12 mx-auto text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Take Photos</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Use your camera to scan documents
                  </p>
                  <Button 
                    onClick={startCameraCapture}
                    className="w-full"
                    variant="outline"
                    data-testid="button-camera"
                  >
                    Open Camera
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Info */}
            <div className="text-center text-sm text-muted-foreground">
              <p>📋 Documents will be processed automatically with AI</p>
              <p>🔍 OCR text extraction and classification happens in the background</p>
              <p>✏️ You can review and edit the details after processing</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { Camera, Upload, X, Check, ArrowLeft } from 'lucide-react';
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

      // Create document record with all photos as pages
      const title = files.length > 1 
        ? `${files.length}-Page Document ${new Date().toLocaleDateString()}`
        : `Document ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;

      const documentData: InsertDocument = {
        userId: user.id,
        childId: selectedChild || null,
        title,
        docType: 'Other',
        storagePath: storagePaths[0], // Main photo for compatibility
        pages: storagePaths, // All pages including the main one
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
      
      return createdDoc;
    },
    onSuccess: (data, files) => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      const pageCount = files.length;
      toast({
        title: `✅ ${pageCount}-Page Document Saved!`,
        description: pageCount > 1 
          ? `All ${pageCount} pages are being processed in the background...`
          : "Your document is being processed in the background...",
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

  // Main camera input handler for iPhone - shows modal with captured photos
  const handleMainCameraInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
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
    
    // Clear any existing photos
    setCapturedPhotos([]);
    setPreviewUrls([]);
    
    // Add all selected photos to captured photos
    const processedFiles: File[] = [];
    const previewUrls: string[] = [];
    
    for (const file of imageFiles) {
      const processedFile = await enhanceImageFile(file);
      processedFiles.push(processedFile);
      previewUrls.push(URL.createObjectURL(processedFile));
    }
    
    setCapturedPhotos(processedFiles);
    setPreviewUrls(previewUrls);
    
    // Show the camera modal with the captured photos
    setShowCameraCapture(true);
    
    // Clear the input for next use
    event.target.value = '';
    
    toast({
      title: `📸 ${imageFiles.length} page${imageFiles.length !== 1 ? 's' : ''} captured!`,
      description: imageFiles.length > 1 
        ? "All pages ready - save your multi-page document!" 
        : "Photo ready - add more pages or save document!",
    });
  };

  // Secondary handler for additional photos from within modal
  const handleCameraFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
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
    
    for (const file of imageFiles) {
      const processedFile = await enhanceImageFile(file);
      
      // Add to existing captured photos array
      setCapturedPhotos(prev => [...prev, processedFile]);
      setPreviewUrls(prev => [...prev, URL.createObjectURL(processedFile)]);
    }
    
    // Clear the input for next capture
    event.target.value = '';
    
    toast({
      title: `📸 ${imageFiles.length} more page${imageFiles.length !== 1 ? 's' : ''} added!`,
      description: "Keep adding pages or save your multi-page document.",
    });
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
    // Check if we're on iOS - use direct camera interface
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS) {
      // For iPhone, directly trigger the camera file input
      const fileInput = document.getElementById('main-camera-input') as HTMLInputElement;
      if (fileInput) {
        fileInput.click();
        return;
      }
    }
    
    // For other devices, try video stream
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
        
        // Ensure video starts playing
        try {
          await videoRef.current.play();
        } catch (playError) {
          console.log('Video play failed:', playError);
        }
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera access failed",
        description: "Please allow camera access to take photos or use the file upload option.",
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
    try {
      setCapturedPhotos(prev => prev.filter((_, i) => i !== index));
      
      // Safely revoke and remove preview URL
      if (previewUrls[index]) {
        URL.revokeObjectURL(previewUrls[index]);
      }
      setPreviewUrls(prev => prev.filter((_, i) => i !== index));
      
      toast({
        title: "Page removed",
        description: `Page ${index + 1} deleted successfully`,
      });
    } catch (error) {
      console.error('Error removing photo:', error);
      toast({
        title: "Error",
        description: "Failed to remove page. Please try again.",
        variant: "destructive",
      });
    }
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
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                📄 Add Document
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/app')}
                className="flex items-center gap-2"
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Camera Capture Modal */}
            {showCameraCapture && (
              <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">📸 Multi-Page Document</h3>
                    <Button variant="ghost" size="sm" onClick={stopCamera}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    {/* iPhone Camera Interface */}
                    {(/iPad|iPhone|iPod/.test(navigator.userAgent)) ? (
                      <div className="text-center">
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
                          <Camera className="w-12 h-12 mx-auto text-blue-600 dark:text-blue-400 mb-2" />
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            {capturedPhotos.length === 0 
                              ? "Add photos to create your multi-page document" 
                              : `${capturedPhotos.length} page${capturedPhotos.length !== 1 ? 's' : ''} added`
                            }
                          </p>
                        </div>
                        
                        <label
                          htmlFor="ios-camera-input"
                          className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer text-lg font-medium"
                        >
                          <Camera className="w-5 h-5 mr-2" />
                          Add More Photos
                        </label>
                        <input
                          id="ios-camera-input"
                          type="file"
                          accept="image/*"
                          capture="environment"
                          multiple
                          className="hidden"
                          onChange={handleCameraFileSelect}
                        />
                      </div>
                    ) : (
                      /* Desktop Camera Interface */
                      <div className="relative">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full rounded-lg bg-black"
                          style={{ maxHeight: '400px' }}
                        />
                        <canvas ref={canvasRef} className="hidden" />
                      </div>
                    )}
                    
                    {/* Captured photos preview */}
                    {previewUrls.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Pages ({previewUrls.length}):
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                          {previewUrls.map((url, index) => (
                            <div key={index} className="relative group">
                              <div className="relative">
                                <img 
                                  src={url} 
                                  alt={`Page ${index + 1}`} 
                                  className="w-full aspect-square object-cover rounded-lg border-2 border-green-400 pointer-events-none"
                                />
                                <div className="absolute top-2 left-2 bg-green-600 text-white text-sm px-2 py-1 rounded font-medium">
                                  {index + 1}
                                </div>
                                {/* Always visible delete button on mobile */}
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    removePhoto(index);
                                  }}
                                  className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold shadow-lg"
                                  data-testid={`button-remove-photo-${index}`}
                                  title="Remove this page"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-3 pt-2">
                      {!(/iPad|iPhone|iPod/.test(navigator.userAgent)) && (
                        <Button onClick={capturePhoto} variant="outline" className="flex-1">
                          <Camera className="w-4 h-4 mr-2" />
                          Take Photo
                        </Button>
                      )}
                      
                      {capturedPhotos.length > 0 && (
                        <Button onClick={savePhotos} className="flex-1 bg-green-600 hover:bg-green-700">
                          <Check className="w-4 h-4 mr-2" />
                          Save {capturedPhotos.length}-Page Document
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
                    Select photos from your device gallery
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
                    accept="image/*,image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    multiple
                    capture="environment"
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
                  {/* Main camera input - for iPhone direct camera access */}
                  <input
                    id="main-camera-input"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    onChange={handleMainCameraInput}
                    className="hidden"
                    data-testid="input-camera-capture"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Multi-page info */}
            {capturedPhotos.length > 0 && (
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  📄 {capturedPhotos.length} page{capturedPhotos.length !== 1 ? 's' : ''} captured
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  All pages will be saved as one multi-page document
                </p>
              </div>
            )}

            {/* Info */}
            <div className="text-center text-sm text-muted-foreground">
              <p>📋 Documents will be processed automatically with AI</p>
              <p>🔍 OCR text extraction and classification happens in the background</p>
              <p>📱 Take multiple photos to create multi-page documents</p>
              <p>✏️ You can review and edit the details after processing</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
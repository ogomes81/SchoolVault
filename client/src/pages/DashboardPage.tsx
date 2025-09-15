import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import DocCard from '@/components/DocCard';
import Filters from '@/components/Filters';
import ChildSelector from '@/components/ChildSelector';
import PhotoGallery from '@/components/PhotoGallery';
import { 
  GraduationCap, 
  FileText, 
  Clock, 
  Calendar, 
  Share, 
  User, 
  Camera,
  Grid3X3,
  LogOut
} from 'lucide-react';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import { generateShareToken, downloadICS, generateICS } from '@/lib/api';
import type { Document, Child } from '@shared/schema';

interface DocumentWithChild extends Document {
  child?: Child;
}

export default function DashboardPage() {
  const { user, loading: authLoading, signOut } = useAuthGuard();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChild, setSelectedChild] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('all');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  
  // Stat card filter state
  const [activeStatFilter, setActiveStatFilter] = useState<'total' | 'dueSoon' | 'thisMonth' | 'shared' | null>(null);
  
  // Photo gallery state
  const [galleryDocument, setGalleryDocument] = useState<DocumentWithChild | null>(null);
  const [galleryInitialPage, setGalleryInitialPage] = useState(0);

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

  // Fetch documents
  const { data: documents = [], isLoading: documentsLoading } = useQuery<DocumentWithChild[]>({
    queryKey: ['/api/documents'],
    enabled: !!user,
  });

  // Share document mutation
  const shareDocumentMutation = useMutation({
    mutationFn: async ({ documentId, isShared }: { documentId: string; isShared: boolean }) => {
      const shareToken = isShared ? generateShareToken() : null;
      return apiRequest('PATCH', `/api/documents/${documentId}`, {
        isShared,
        shareToken,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({
        title: "Document sharing updated",
        description: "Sharing settings have been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update sharing",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      // Child filter - must match selected child (no 'all' option)
      if (!selectedChild || doc.childId !== selectedChild) {
        return false;
      }
      
      // Stat card filter
      if (activeStatFilter) {
        const now = new Date();
        const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        switch (activeStatFilter) {
          case 'total':
            // Show all documents (no additional filter)
            break;
          case 'dueSoon':
            // Show documents due within a week
            if (!doc.dueDate || 
                new Date(doc.dueDate) < now || 
                new Date(doc.dueDate) > oneWeekFromNow) {
              return false;
            }
            break;
          case 'thisMonth':
            // Show documents created this month
            if (new Date(doc.createdAt) < startOfMonth) {
              return false;
            }
            break;
          case 'shared':
            // Show only shared documents
            if (!doc.isShared) {
              return false;
            }
            break;
        }
      }
      
      // Doc type filter
      if (docTypeFilter !== 'all' && doc.docType !== docTypeFilter) {
        return false;
      }
      
      // Date range filter
      if (dateFromFilter || dateToFilter) {
        const docDate = new Date(doc.createdAt);
        if (dateFromFilter && docDate < new Date(dateFromFilter)) return false;
        if (dateToFilter && docDate > new Date(dateToFilter)) return false;
      }
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchText = [
          doc.title,
          doc.ocrText,
          ...(Array.isArray(doc.tags) ? doc.tags : []),
          doc.teacher,
          doc.subject,
        ].filter(Boolean).join(' ').toLowerCase();
        
        return searchText.includes(query);
      }
      
      return true;
    });
  }, [documents, selectedChild, docTypeFilter, dateFromFilter, dateToFilter, searchQuery, activeStatFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return {
      totalDocs: documents.length,
      dueSoon: documents.filter(doc => 
        doc.dueDate && 
        new Date(doc.dueDate) >= now && 
        new Date(doc.dueDate) <= oneWeekFromNow
      ).length,
      thisMonth: documents.filter(doc => 
        new Date(doc.createdAt) >= startOfMonth
      ).length,
      shared: documents.filter(doc => doc.isShared).length,
    };
  }, [documents]);

  const handleDocumentClick = (documentId: string, useGallery: boolean = false, initialPage: number = 0) => {
    const document = documents.find(doc => doc.id === documentId);
    if (!document) return;
    
    if (useGallery) {
      // Open in gallery mode for multi-page documents
      setGalleryDocument(document);
      setGalleryInitialPage(initialPage);
    } else {
      // Navigate to document detail page
      navigate(`/app/doc/${documentId}`);
    }
  };
  
  const handleCloseGallery = () => {
    setGalleryDocument(null);
    setGalleryInitialPage(0);
  };

  const handleShare = async (documentId: string) => {
    const document = documents.find(doc => doc.id === documentId);
    if (!document) return;
    
    shareDocumentMutation.mutate({
      documentId,
      isShared: !document.isShared,
    });
  };

  const handleExportCalendar = (documentId: string) => {
    const document = documents.find(doc => doc.id === documentId);
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

  const handleStatCardClick = (filterType: 'total' | 'dueSoon' | 'thisMonth' | 'shared') => {
    // If clicking the same filter, clear it (toggle off)
    if (activeStatFilter === filterType) {
      setActiveStatFilter(null);
      // Clear other filters too when deselecting stat filter
      setSearchQuery('');
      setDocTypeFilter('all');
      setDateFromFilter('');
      setDateToFilter('');
    } else {
      // Set new filter and clear other conflicting filters
      setActiveStatFilter(filterType);
      setSearchQuery('');
      setDocTypeFilter('all');
      setDateFromFilter('');
      setDateToFilter('');
    }
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold hidden sm:block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">SchoolVault</h1>
            </div>

            <div className="flex items-center gap-3">
              <ChildSelector
                children={children}
                selectedChildId={selectedChild}
                onChildChange={setSelectedChild}
                includeAll={false}
              />
              
              <Button variant="ghost" size="sm" onClick={signOut} data-testid="button-signout">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 lg:pb-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card 
            className={`bg-gradient-to-r from-blue-500 to-blue-600 border-0 shadow-xl text-white cursor-pointer transition-all duration-200 hover:scale-105 ${
              activeStatFilter === 'total' ? 'ring-4 ring-white/50 scale-105' : ''
            }`}
            onClick={() => handleStatCardClick('total')}
            data-testid="stat-card-total"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-100">Total Documents</p>
                  <p className="text-2xl font-bold text-white" data-testid="stat-total-docs">
                    {stats.totalDocs}
                  </p>
                </div>
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className={`bg-gradient-to-r from-orange-500 to-red-500 border-0 shadow-xl text-white cursor-pointer transition-all duration-200 hover:scale-105 ${
              activeStatFilter === 'dueSoon' ? 'ring-4 ring-white/50 scale-105' : ''
            }`}
            onClick={() => handleStatCardClick('dueSoon')}
            data-testid="stat-card-due-soon"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-100">Due This Week</p>
                  <p className="text-2xl font-bold text-white" data-testid="stat-due-soon">
                    {stats.dueSoon}
                  </p>
                </div>
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className={`bg-gradient-to-r from-green-500 to-emerald-500 border-0 shadow-xl text-white cursor-pointer transition-all duration-200 hover:scale-105 ${
              activeStatFilter === 'thisMonth' ? 'ring-4 ring-white/50 scale-105' : ''
            }`}
            onClick={() => handleStatCardClick('thisMonth')}
            data-testid="stat-card-this-month"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-100">This Month</p>
                  <p className="text-2xl font-bold text-white" data-testid="stat-this-month">
                    {stats.thisMonth}
                  </p>
                </div>
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className={`bg-gradient-to-r from-purple-500 to-pink-500 border-0 shadow-xl text-white cursor-pointer transition-all duration-200 hover:scale-105 ${
              activeStatFilter === 'shared' ? 'ring-4 ring-white/50 scale-105' : ''
            }`}
            onClick={() => handleStatCardClick('shared')}
            data-testid="stat-card-shared"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-100">Shared</p>
                  <p className="text-2xl font-bold text-white" data-testid="stat-shared">
                    {stats.shared}
                  </p>
                </div>
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Share className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Filters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          docTypeFilter={docTypeFilter}
          onDocTypeChange={setDocTypeFilter}
          dateFromFilter={dateFromFilter}
          onDateFromChange={setDateFromFilter}
          dateToFilter={dateToFilter}
          onDateToChange={setDateToFilter}
        />

        {/* Documents Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-card-foreground">
              {searchQuery ? `Search Results (${filteredDocuments.length})` : 'Recent Documents'}
            </h2>
            <Button variant="ghost" size="sm">
              <Grid3X3 className="w-4 h-4" />
            </Button>
          </div>

          {documentsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="aspect-video bg-muted"></div>
                  <CardContent className="p-4">
                    <div className="h-4 bg-muted rounded mb-2"></div>
                    <div className="h-3 bg-muted rounded w-2/3 mb-3"></div>
                    <div className="flex gap-1 mb-3">
                      <div className="h-5 bg-muted rounded w-12"></div>
                      <div className="h-5 bg-muted rounded w-16"></div>
                    </div>
                    <div className="flex justify-between">
                      <div className="h-3 bg-muted rounded w-16"></div>
                      <div className="h-3 bg-muted rounded w-12"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredDocuments.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-card-foreground mb-2">
                {searchQuery ? 'No documents found' : 'No documents yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery 
                  ? 'Try adjusting your search filters or terms.'
                  : 'Upload your first school document to get started.'
                }
              </p>
              {!searchQuery && (
                <Button onClick={() => navigate('/app/upload')} data-testid="button-upload-first">
                  <Camera className="w-4 h-4 mr-2" />
                  Upload Document
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredDocuments.map((doc) => (
                <DocCard
                  key={doc.id}
                  document={doc}
                  onDocumentClick={handleDocumentClick}
                  onShare={handleShare}
                  onExportCalendar={handleExportCalendar}
                />
              ))}
            </div>
          )}

          {/* Load More Button */}
          {filteredDocuments.length > 0 && filteredDocuments.length >= 12 && (
            <div className="text-center pt-6">
              <Button variant="outline" data-testid="button-load-more">
                Load More Documents
              </Button>
            </div>
          )}
        </div>
      </main>


      {/* Photo Gallery Modal */}
      {galleryDocument && (
        <PhotoGallery
          document={galleryDocument}
          isOpen={!!galleryDocument}
          onClose={handleCloseGallery}
          initialPage={galleryInitialPage}
        />
      )}
    </div>
  );
}

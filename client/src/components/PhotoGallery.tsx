import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDocumentUrl } from '@/lib/supabase';
import type { Document } from '@shared/schema';

interface PhotoGalleryProps {
  document: Document;
  isOpen: boolean;
  onClose: () => void;
  initialPage?: number;
}

export default function PhotoGallery({ document, isOpen, onClose, initialPage = 0 }: PhotoGalleryProps) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  
  // Parse pages data
  const raw = (document as any)?.pages;
  let parsed: string[] = Array.isArray(raw) 
    ? raw 
    : (typeof raw === 'string' 
      ? (() => { try { return JSON.parse(raw); } catch { return []; } })()
      : []);
  const pages = parsed.length ? parsed : [document.storagePath];
  
  // Reset to initial page when document changes
  useEffect(() => {
    setCurrentPage(initialPage);
  }, [initialPage, document.id]);
  
  // Clamp current page when pages change
  useEffect(() => {
    setCurrentPage(prev => Math.min(prev, pages.length - 1));
  }, [pages.length]);
  
  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && currentPage > 0) setCurrentPage(currentPage - 1);
      if (e.key === 'ArrowRight' && currentPage < pages.length - 1) setCurrentPage(currentPage + 1);
    };
    
    if (isOpen) {
      window.document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when gallery is open
      window.document.body.style.overflow = 'hidden';
    }
    
    return () => {
      window.document.removeEventListener('keydown', handleKeyDown);
      window.document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, currentPage, pages.length]);
  
  // Swipe gesture handlers
  const minSwipeDistance = 50;
  
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    }
    if (isRightSwipe && currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  const handleDownload = () => {
    const currentPagePath = pages[currentPage];
    const imageUrl = getDocumentUrl(currentPagePath);
    const link = window.document.createElement('a');
    const pageText = pages.length > 1 ? `_page${currentPage + 1}` : '';
    link.href = imageUrl;
    link.download = `${document.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}${pageText}.jpg`;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };
  
  if (!isOpen) return null;
  
  const currentImageUrl = getDocumentUrl(pages[currentPage]);
  
  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex justify-between items-center p-4 bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex-1">
          <h2 className="text-white font-medium truncate">{document.title}</h2>
          {pages.length > 1 && (
            <p className="text-white/70 text-sm">Page {currentPage + 1} of {pages.length}</p>
          )}
        </div>
        <div className="flex gap-2 ml-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={(e) => { e.stopPropagation(); handleDownload(); }}
            className="text-white hover:bg-white/20"
            data-testid="button-gallery-download"
          >
            <Download className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/20"
            data-testid="button-gallery-close"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Navigation arrows for multi-page */}
      {pages.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="lg"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 disabled:opacity-30"
            onClick={(e) => { e.stopPropagation(); setCurrentPage(Math.max(0, currentPage - 1)); }}
            disabled={currentPage === 0}
            data-testid="button-gallery-prev"
          >
            <ChevronLeft className="w-8 h-8" />
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 disabled:opacity-30"
            onClick={(e) => { e.stopPropagation(); setCurrentPage(Math.min(pages.length - 1, currentPage + 1)); }}
            disabled={currentPage === pages.length - 1}
            data-testid="button-gallery-next"
          >
            <ChevronRight className="w-8 h-8" />
          </Button>
        </>
      )}
      
      {/* Main image */}
      <div 
        className="absolute inset-0 flex items-center justify-center p-8"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={currentImageUrl}
          alt={`${document.title} - Page ${currentPage + 1}`}
          className="max-w-full max-h-full object-contain select-none"
          data-testid="img-gallery-current"
        />
      </div>
      
      {/* Page dots indicator for multi-page */}
      {pages.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
          {pages.map((_, index) => (
            <button
              key={index}
              onClick={(e) => { e.stopPropagation(); setCurrentPage(index); }}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentPage 
                  ? 'bg-white' 
                  : 'bg-white/40 hover:bg-white/60'
              }`}
              data-testid={`dot-page-${index}`}
            />
          ))}
        </div>
      )}
      
      {/* Mobile swipe hint */}
      {pages.length > 1 && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-white/60 text-xs sm:hidden">
          Swipe to navigate
        </div>
      )}
    </div>
  );
}
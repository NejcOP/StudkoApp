import { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Lock, AlertCircle, Eye, ShoppingCart, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface NotePreviewProps {
  fileUrl: string;
  onPurchase: () => void;
  price: number;
  purchasing?: boolean;
  pageNumber?: number;
  totalPages?: number;
  isOwner?: boolean;
}

type FileType = 'pdf' | 'image' | 'unknown';

const getFileType = (url: string): FileType => {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('.pdf') || lowerUrl.includes('application/pdf')) {
    return 'pdf';
  }
  if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg') || 
      lowerUrl.includes('.png') || lowerUrl.includes('.webp') ||
      lowerUrl.includes('image/')) {
    return 'image';
  }
  // Default to PDF for blob URLs without extension
  if (lowerUrl.startsWith('blob:')) {
    return 'pdf';
  }
  return 'pdf';
};

export function NotePreview({ fileUrl, onPurchase, price, purchasing = false, pageNumber: fileIndex = 1, totalPages: totalFiles = 1, isOwner = false }: NotePreviewProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [fileType, setFileType] = useState<FileType>('unknown');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [containerWidth, setContainerWidth] = useState(800);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFileType(getFileType(fileUrl));
  }, [fileUrl]);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(Math.min(800, containerRef.current.offsetWidth - 32));
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  // Calculate preview pages (25% minimum 1 page)
  const previewPages = Math.max(1, Math.ceil(numPages * 0.25));
  const isPreviewPage = currentPage <= previewPages;
  const lockedPages = numPages - previewPages;

  // Prevent context menu and selection
  const preventActions = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
  };

  // Image preview with LEFT 25% clear, RIGHT 75% blurred (stacked images approach)
  if (fileType === 'image') {
    return (
      <div className="space-y-4" ref={containerRef}>
        {/* Premium Preview Header */}
        <Card className="p-4 sm:p-5 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-primary/20 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow-primary flex-shrink-0">
              <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="font-bold text-foreground text-base sm:text-lg">
                  Predogled zapiska
                  {totalFiles > 1 && ` - ${fileIndex}/${totalFiles}`}
                </h3>
                <Badge variant="secondary" className="bg-primary/20 text-primary border-0 text-xs">
                  25% vidno
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                {isOwner 
                  ? 'Tako tvoj zapisek vidijo drugi pred nakupom - samo levi del (25%).'
                  : 'Ogledaš si lahko levi del zapiska. Za celoten dostop kupi zapisek.'
                }
              </p>
              {!isOwner && (
                <Button 
                  onClick={onPurchase} 
                  disabled={purchasing}
                  variant="hero"
                  size="sm"
                  className="shadow-glow-primary h-10 px-4"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {purchasing ? "Kupujem..." : `Odkleni za ${price.toFixed(2)}€`}
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Image Preview with LEFT 25% visible, RIGHT 75% blurred using stacked images */}
        <Card className="relative overflow-hidden bg-card border-border shadow-xl">
          <div 
            className="note-preview relative select-none"
            onContextMenu={preventActions}
            style={{ userSelect: "none", WebkitUserSelect: "none" }}
          >
            {/* Blurred background image - full width */}
            <img
              src={fileUrl}
              alt="Note preview blurred"
              className="w-full h-auto"
              style={{ 
                filter: 'blur(var(--note-blur, 8px))',
                transform: 'scale(1.02)',
              }}
              onLoad={() => setImageLoaded(true)}
              draggable={false}
            />
            
            {imageLoaded && (
              <>
                {/* Clear left 25% overlay using clip-path */}
                <img
                  src={fileUrl}
                  alt="Note preview clear"
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ 
                    clipPath: 'inset(0 75% 0 0)',
                  }}
                  draggable={false}
                />
                
                {/* Vertical gradient transition line at 25% */}
                <div 
                  className="absolute top-0 bottom-0 w-8 sm:w-12 pointer-events-none"
                  style={{
                    left: 'calc(25% - 1rem)',
                    background: 'linear-gradient(to right, transparent, hsla(var(--primary) / 0.15), transparent)',
                  }}
                />
                
                {/* Watermark on visible portion */}
                <div 
                  className="absolute top-0 bottom-0 left-0 pointer-events-none flex items-center justify-center overflow-hidden"
                  style={{ 
                    width: '25%',
                  }}
                >
                  <div 
                    className="text-lg sm:text-xl md:text-2xl font-bold opacity-10 rotate-[-45deg] select-none whitespace-nowrap"
                    style={{
                      color: "hsl(var(--primary))",
                      textShadow: "1px 1px 2px rgba(0,0,0,0.1)",
                      letterSpacing: "0.05em"
                    }}
                  >
                    ŠTUDKO
                  </div>
                </div>
                
                {/* Lock overlay on blurred section (right 80%) */}
                <div 
                  className="absolute top-0 bottom-0 right-0 flex items-center justify-center pointer-events-none"
                  style={{ left: '25%' }}
                >
                  <div className="text-center p-3 sm:p-6 rounded-xl sm:rounded-2xl bg-background/60 backdrop-blur-sm border border-border/50 shadow-xl max-w-[80%]">
                    <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-2 sm:mb-4 shadow-glow-primary">
                      <Lock className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
                    </div>
                    <h3 className="text-sm sm:text-xl font-bold text-foreground mb-1 sm:mb-2">80% zaklenjeno</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-4 max-w-xs hidden sm:block">
                      {isOwner ? 'Tvoj zapisek - preview za kupce' : 'Kupi zapisek za dostop do celotne vsebine'}
                    </p>
                    {!isOwner && (
                      <Button 
                        onClick={onPurchase}
                        disabled={purchasing}
                        variant="hero"
                        size="sm"
                        className="shadow-glow-primary pointer-events-auto h-9 sm:h-10 text-xs sm:text-sm px-3 sm:px-4"
                      >
                        <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        {purchasing ? "..." : `${price.toFixed(2)}€`}
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // PDF Preview with LEFT 25% clear, RIGHT 75% blurred (for single-page) or page-based (multi-page)
  return (
    <div className="space-y-4" ref={containerRef}>
      {/* Premium Preview Header */}
      <Card className="p-4 sm:p-5 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-primary/20 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow-primary flex-shrink-0">
            <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-bold text-foreground text-base sm:text-lg">
                Predogled zapiska
              </h3>
              <Badge variant="secondary" className="bg-primary/20 text-primary border-0 text-xs">
                {numPages <= 1 ? '25% vidno' : `${previewPages} od ${numPages || '?'} strani`}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
              {isOwner 
                ? (numPages <= 1 
                    ? 'Tako tvoj zapisek vidijo drugi - levi del (25%) je viden.'
                    : `Tako tvoj zapisek vidijo drugi - prvih ${Math.round((previewPages / Math.max(numPages, 1)) * 100)}% (${previewPages} ${previewPages === 1 ? 'stran' : 'strani'}) je vidnih.`
                  )
                : (numPages <= 1 
                    ? 'Ogledaš si lahko levi del zapiska. Za celoten dostop kupi zapisek.'
                    : `Ogledaš si lahko prvih ${Math.round((previewPages / Math.max(numPages, 1)) * 100)}% zapiska (${previewPages} ${previewPages === 1 ? 'stran' : 'strani'}). ${lockedPages > 0 ? `${lockedPages} ${lockedPages === 1 ? 'stran je zaklenjena' : 'strani so zaklenjene'}.` : ''}`
                  )
              }
            </p>
            {!isOwner && (
              <Button 
                onClick={onPurchase} 
                disabled={purchasing}
                variant="hero"
                size="sm"
                className="shadow-glow-primary h-10 px-4"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                {purchasing ? "Kupujem..." : `Odkleni vse za ${price.toFixed(2)}€`}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* PDF Viewer */}
      <Card className="relative overflow-hidden bg-card border-border shadow-xl">
        <div 
          className="note-preview relative select-none"
          onContextMenu={preventActions}
          style={{ userSelect: "none", WebkitUserSelect: "none" }}
        >
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex items-center justify-center h-[400px] sm:h-[600px]">
                <div className="text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground font-medium text-sm sm:text-base">Nalaganje predogleda...</p>
                </div>
              </div>
            }
            error={
              <div className="flex items-center justify-center h-[400px] sm:h-[600px]">
                <div className="text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-destructive" />
                  </div>
                  <p className="text-foreground font-semibold mb-2 text-sm sm:text-base">
                    Napaka pri nalaganju
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Predogled ni na voljo
                  </p>
                </div>
              </div>
            }
          >
            <div className="relative">
              <Page
                pageNumber={currentPage}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                className="mx-auto"
                width={containerWidth}
              />
              
              {/* For preview pages: LEFT 25% clear, RIGHT 75% blur */}
              {isPreviewPage && (
                <>
                  {/* Blur overlay for right 75% */}
                  <div 
                    className="absolute top-0 bottom-0 right-0 pointer-events-none"
                    style={{
                      left: '25%',
                      backdropFilter: 'blur(var(--note-blur, 8px))',
                      WebkitBackdropFilter: 'blur(var(--note-blur, 8px))',
                    }}
                  />
                  
                  {/* Gradient transition line */}
                  <div 
                    className="absolute top-0 bottom-0 w-8 sm:w-12 pointer-events-none"
                    style={{
                      left: 'calc(25% - 1rem)',
                      background: 'linear-gradient(to right, transparent, hsla(var(--primary) / 0.15), transparent)',
                    }}
                  />
                  
                  {/* Lock overlay on blurred section */}
                  <div 
                    className="absolute top-0 bottom-0 right-0 flex items-center justify-center pointer-events-none"
                    style={{ left: '30%' }}
                  >
                    <div className="text-center p-3 sm:p-6 rounded-xl sm:rounded-2xl bg-background/70 backdrop-blur-sm border border-border/50 shadow-xl">
                      <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-2 sm:mb-3 shadow-glow-primary">
                        <Lock className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                      </div>
                      <h3 className="text-sm sm:text-lg font-bold text-foreground mb-1 sm:mb-2">Zaklenjeno</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 max-w-[180px] hidden sm:block">
                        {isOwner ? 'Tvoj zapisek - preview' : 'Kupi za celoten dostop'}
                      </p>
                      {!isOwner && (
                        <Button 
                          onClick={onPurchase}
                          disabled={purchasing}
                          variant="hero"
                          size="sm"
                          className="shadow-glow-primary pointer-events-auto h-9 text-xs px-3"
                        >
                          {purchasing ? "..." : `${price.toFixed(2)}€`}
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )}
              
              {/* Multi-page PDFs: Watermark on preview pages */}
              {numPages > 1 && isPreviewPage && (
                <div 
                  className="absolute inset-0 pointer-events-none flex items-center justify-center"
                  style={{ 
                    background: "repeating-linear-gradient(45deg, transparent, transparent 100px, hsla(var(--primary) / 0.02) 100px, hsla(var(--primary) / 0.02) 200px)"
                  }}
                >
                  <div 
                    className="text-2xl sm:text-4xl md:text-5xl font-bold opacity-15 rotate-[-30deg] select-none"
                    style={{
                      color: "hsl(var(--primary))",
                      textShadow: "2px 2px 4px rgba(0,0,0,0.1)",
                      letterSpacing: "0.08em"
                    }}
                  >
                    ŠTUDKO – PREVIEW
                  </div>
                </div>
              )}

              {/* Locked Pages Overlay for multi-page PDFs */}
              {numPages > 1 && !isPreviewPage && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
                  <div className="absolute inset-0 bg-background/60" />
                  <div className="text-center p-4 sm:p-8 rounded-xl sm:rounded-2xl bg-background/80 backdrop-blur-sm border border-border shadow-2xl relative z-10 mx-4">
                    <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-glow-primary">
                      <Lock className="w-7 h-7 sm:w-10 sm:h-10 text-white" />
                    </div>
                    <h3 className="text-lg sm:text-2xl font-bold text-foreground mb-1 sm:mb-2">Zaklenjena stran</h3>
                    <p className="text-muted-foreground mb-1 sm:mb-2 text-sm sm:text-base">
                      Stran {currentPage} od {numPages}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6 max-w-xs mx-auto">
                      {isOwner 
                        ? `Tako vidijo kupci - samo prvih ${previewPages} strani je vidnih`
                        : `Kupi zapisek za dostop do vseh ${numPages} strani`
                      }
                    </p>
                    {!isOwner && (
                      <Button 
                        onClick={onPurchase}
                        disabled={purchasing}
                        variant="hero"
                        size="lg"
                        className="shadow-glow-primary h-10 sm:h-12 text-sm sm:text-base"
                      >
                        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                        {purchasing ? "Kupujem..." : `Odkleni za ${price.toFixed(2)}€`}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Document>
        </div>

        {/* Navigation */}
        {numPages > 0 && (
          <div className="flex items-center justify-between p-3 sm:p-4 border-t border-border bg-muted/50">
            <Button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm h-9"
            >
              Prejšnja
            </Button>
            
            <div className="flex items-center gap-2">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Stran {currentPage} od {numPages}
              </p>
              {!isPreviewPage && (
                <Badge variant="secondary" className="bg-destructive/10 text-destructive border-0 text-xs">
                  <Lock className="w-3 h-3 mr-1" />
                  Zaklenjeno
                </Badge>
              )}
              {isPreviewPage && numPages > 1 && (
                <Badge variant="secondary" className="bg-primary/10 text-primary border-0 text-xs">
                  <Eye className="w-3 h-3 mr-1" />
                  Predogled
                </Badge>
              )}
            </div>
            
            <Button
              onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))}
              disabled={currentPage >= numPages}
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm h-9"
            >
              Naslednja
            </Button>
          </div>
        )}
      </Card>

      {/* Bottom CTA for locked content */}
      {numPages > previewPages && (
        <Card className="p-3 sm:p-4 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              <span className="text-xs sm:text-sm text-muted-foreground">
                <strong className="text-foreground">{lockedPages}</strong> {lockedPages === 1 ? 'stran zaklenjena' : 'strani zaklenjene'}
              </span>
            </div>
            <Button 
              onClick={onPurchase}
              disabled={purchasing}
              variant="hero"
              size="sm"
              className="h-10 px-4 text-sm w-full sm:w-auto"
            >
              {purchasing ? "Kupujem..." : `Odkleni vse – ${price.toFixed(2)}€`}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "./ui/button";
import AdSenseAd from "./AdSenseAd";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const InternalPdfReader = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [bookTitle, setBookTitle] = useState<string>("");
  const [bookPrice, setBookPrice] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [adKey, setAdKey] = useState(0);
  const [zoom, setZoom] = useState(1.0);

  useEffect(() => {
    if (id) {
      fetchBookAndPdf(id);
    }
  }, [id]);

  const fetchBookAndPdf = async (slugOrId: string) => {
    try {
      // Check if it's a UUID or a slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
      
      let book;
      
      if (isUUID) {
        // Fetch by ID
        const { data, error: bookError } = await supabase
          .from("books")
          .select("*")
          .eq("id", slugOrId)
          .single();
        
        if (bookError) throw bookError;
        book = data;
      } else {
        // Fetch by slug
        const { data: allBooks, error: fetchError } = await supabase
          .from("books")
          .select("*");
        
        if (fetchError) throw fetchError;
        
        const matchedBook = allBooks?.find(b => {
          const bookSlug = b.title
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
          return bookSlug === slugOrId;
        });
        
        if (!matchedBook) {
          toast.error("Book not found");
          navigate("/");
          return;
        }
        
        book = matchedBook;
      }

      if (!book) {
        toast.error("Book not found");
        navigate("/");
        return;
      }

      setBookTitle(book.title);
      setBookPrice(book.price);

      // Check if book is free
      if (book.price === 0) {
        // Free book - anyone can view
        const { data: signedUrlData } = await supabase.storage
          .from("book-pdfs")
          .createSignedUrl(book.pdf_url, 3600);

        if (signedUrlData?.signedUrl) {
          setPdfUrl(signedUrlData.signedUrl);
        }
      } else {
        // Paid book - check purchase
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          toast.error("Please sign in to read this book");
          const slug = book.title
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
          navigate(`/book/${slug}`);
          return;
        }

        // Check if user has purchased
        const { data: purchase } = await supabase
          .from("purchases")
          .select("*")
          .eq("book_id", book.id)
          .eq("buyer_id", user.id)
          .eq("payment_status", "completed")
          .single();

        if (!purchase) {
          toast.error("You need to purchase this book first");
          const slug = book.title
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
          navigate(`/book/${slug}`);
          return;
        }

        // User has purchased - get signed URL
        const { data: signedUrlData } = await supabase.storage
          .from("book-pdfs")
          .createSignedUrl(book.pdf_url, 3600);

        if (signedUrlData?.signedUrl) {
          setPdfUrl(signedUrlData.signedUrl);
        }
      }
    } catch (error) {
      console.error("Error fetching book:", error);
      toast.error("Failed to load book");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (direction: "prev" | "next") => {
    if (direction === "prev" && currentPage > 1) {
      setCurrentPage(currentPage - 1);
      setAdKey(prev => prev + 1); // Refresh ads
    } else if (direction === "next" && currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      setAdKey(prev => prev + 1); // Refresh ads
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setTotalPages(numPages);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3.0));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setZoom(1.0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!pdfUrl) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Ad */}
      <div className="w-full bg-muted py-4">
        <div className="container mx-auto">
          <AdSenseAd key={`top-${adKey}`} adType="display" className="flex justify-center" />
        </div>
      </div>

      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          
          <h1 className="text-lg font-semibold text-center flex-1 truncate">
            {bookTitle}
          </h1>
          
          <div className="w-20" />
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto relative">
          <div className="bg-card rounded-lg shadow-lg overflow-auto flex items-center justify-center p-4">
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
                </div>
              }
              error={
                <div className="text-destructive p-8 text-center">
                  Failed to load PDF. Please try again.
                </div>
              }
            >
              <Page
                pageNumber={currentPage}
                renderTextLayer={true}
                renderAnnotationLayer={bookPrice !== 0}
                className="max-w-full"
                scale={zoom}
              />
            </Document>
          </div>

          {/* Zoom Controls - Bottom Right */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-2">
            <Button
              variant="secondary"
              size="icon"
              onClick={handleZoomIn}
              disabled={zoom >= 3.0}
              className="h-10 w-10 shadow-lg"
            >
              <ZoomIn className="h-5 w-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={handleResetZoom}
              className="h-10 w-10 shadow-lg text-xs font-semibold"
            >
              {Math.round(zoom * 100)}%
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
              className="h-10 w-10 shadow-lg"
            >
              <ZoomOut className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange("prev")}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange("next")}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom Ad */}
      <div className="w-full bg-muted py-4 mt-8">
        <div className="container mx-auto">
          <AdSenseAd key={`bottom-${adKey}`} adType="display" className="flex justify-center" />
        </div>
      </div>
    </div>
  );
};

export default InternalPdfReader;

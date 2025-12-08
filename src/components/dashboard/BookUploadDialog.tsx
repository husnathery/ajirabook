import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus } from "lucide-react";

const BookUploadDialog = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    description: "",
    price: "",
    year: "",
    category: "",
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!coverFile || !pdfFile) {
      toast.error("Please select both cover image and PDF file");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if book review is required
      const { data: settingData } = await supabase
        .from("admin_settings")
        .select("setting_value")
        .eq("setting_key", "require_book_review")
        .single();

      const requireReview = settingData?.setting_value || false;

      // Upload cover image
      const coverExt = coverFile.name.split('.').pop();
      const coverPath = `${user.id}/${Date.now()}.${coverExt}`;
      const { error: coverError } = await supabase.storage
        .from('book-covers')
        .upload(coverPath, coverFile);

      if (coverError) throw coverError;

      // Upload PDF
      const pdfPath = `${user.id}/${Date.now()}.pdf`;
      const { error: pdfError } = await supabase.storage
        .from('book-pdfs')
        .upload(pdfPath, pdfFile);

      if (pdfError) throw pdfError;

      // Get cover public URL
      const { data: { publicUrl } } = supabase.storage
        .from('book-covers')
        .getPublicUrl(coverPath);

      // Create book record
      const { error: bookError } = await supabase
        .from('books')
        .insert({
          seller_id: user.id,
          title: formData.title,
          author: formData.author,
          description: formData.description,
          price: parseFloat(formData.price),
          year: parseInt(formData.year),
          cover_url: publicUrl,
          pdf_url: pdfPath,
          category_id: formData.category || null,
          review_status: requireReview ? 'pending' : 'approved',
        });

      if (bookError) throw bookError;

      if (requireReview) {
        toast.success("Book submitted for review! It will appear in the feed once approved.");
      } else {
        toast.success("Book uploaded successfully!");
      }
      
      setOpen(false);
      setFormData({
        title: "",
        author: "",
        description: "",
        price: "",
        year: "",
        category: "",
      });
      setCoverFile(null);
      setPdfFile(null);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || "Failed to upload book");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Sell PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Book</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Book Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="author">Author *</Label>
            <Input
              id="author"
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="price">Price (Tsh) *</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="100"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="year">Year *</Label>
              <Input
                id="year"
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select category (optional)" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="cover">Cover Image *</Label>
            <Input
              id="cover"
              type="file"
              accept="image/*"
              onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
              required
            />
          </div>
          <div>
            <Label htmlFor="pdf">PDF File *</Label>
            <Input
              id="pdf"
              type="file"
              accept=".pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Uploading..." : "Upload Book"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BookUploadDialog;

import { useState, useEffect } from "react";
import { Eye } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface BookCard3DProps {
  id: string;
  title: string;
  coverUrl: string;
  price: number;
  views: number;
  onPurchase: (bookId: string, phone: string) => void;
  onDownload?: (bookId: string) => void;
  canDownload?: boolean;
  onTitleClick?: () => void;
}

const BookCard3D = ({
  id,
  title,
  coverUrl,
  price,
  views,
  onPurchase,
  onDownload,
  canDownload = false,
  onTitleClick,
}: BookCard3DProps) => {
  const [phone, setPhone] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userPhone, setUserPhone] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone")
        .eq("id", user.id)
        .single();
      if (profile) {
        setUserPhone(profile.phone);
        setPhone(profile.phone);
      }
    }
  };

  const handlePurchase = async () => {
    if (!user) {
      toast.error("Please login to purchase books");
      navigate("/auth");
      return;
    }

    if (!phone.match(/^(07|06)\d{8}$/)) {
      toast.error("Please enter a valid phone number (07XXXXXXXX or 06XXXXXXXX)");
      return;
    }
    
    onPurchase(id, phone);
  };

  // Capitalize first letter, rest lowercase
  const formatTitle = (title: string) => {
    const truncated = title.length > 10 ? title.substring(0, 10) : title;
    return truncated.charAt(0).toUpperCase() + truncated.slice(1).toLowerCase();
  };

  return (
    <article className="bg-card rounded-2xl p-4 border border-border flex flex-col items-center shadow-[var(--shadow-card)]">
      {/* Book Cover Image */}
      <div 
        className="mb-3 w-32 h-40 cursor-pointer"
        onClick={onTitleClick}
      >
        {imageError ? (
          <div className="w-full h-full rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-md">
            <span className="text-xs text-center px-2 text-muted-foreground">{formatTitle(title)}</span>
          </div>
        ) : (
          <img
            src={coverUrl}
            alt={title}
            onError={() => setImageError(true)}
            className="w-full h-full rounded-lg object-cover shadow-md hover:shadow-lg transition-shadow"
          />
        )}
      </div>

      {/* Book Info */}
      <h3 
        className="text-sm font-semibold text-primary mb-1 cursor-pointer hover:underline"
        onClick={onTitleClick}
      >
        {formatTitle(title)}
      </h3>
      
      <div className="flex items-center justify-between w-full mb-3 px-2">
        <span className="text-sm font-medium">Tsh {price.toLocaleString()}</span>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Eye className="h-3 w-3" />
          <span>{views}</span>
        </div>
      </div>

      {/* Phone Input */}
      {user && (
        <Input
          type="tel"
          placeholder="07XXXXXXXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          maxLength={10}
          className="w-full mb-2 text-sm"
          disabled={!!userPhone}
        />
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 w-full">
        <Button
          onClick={handlePurchase}
          className="flex-1 bg-gradient-to-br from-primary to-primary-glow hover:from-primary-dark hover:to-primary text-sm"
          size="sm"
        >
          Read
        </Button>
        <Button
          onClick={() => canDownload && onDownload?.(id)}
          disabled={!canDownload}
          variant="outline"
          size="sm"
          className="px-3"
        >
          PDF
        </Button>
      </div>
    </article>
  );
};

export default BookCard3D;
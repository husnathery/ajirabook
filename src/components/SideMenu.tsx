import { useState, useEffect } from "react";
import { Home, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onCategorySelect?: (categoryName: string | null) => void;
}

interface Category {
  id: string;
  name: string;
  visible_in_menu: boolean;
  menu_order: number;
}

const SideMenu = ({ isOpen, onClose, onCategorySelect }: SideMenuProps) => {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("visible_in_menu", true)
        .order("menu_order", { ascending: true })
        .limit(10);

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleSelect = (value: string | null) => {
    onCategorySelect?.(value);
    onClose();
  };

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 h-full w-72 bg-card border-r border-border z-50 transition-transform duration-300 flex flex-col",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="p-6 flex-1 overflow-y-auto">
        <h2 className="text-xl font-bold mb-6 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
         Books Categories
        </h2>
        <nav className="space-y-2">
          <button
            onClick={() => handleSelect(null)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors text-left"
          >
            <Home className="h-5 w-5 text-primary" />
            <span className="font-medium">Home</span>
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleSelect(category.name)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors text-left"
            >
              <BookOpen className="h-5 w-5 text-primary" />
              <span className="font-medium">{category.name}</span>
            </button>
          ))}
        </nav>
      </div>
      
      {/* Legal Links */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-4 justify-center text-xs text-muted-foreground">
          <a 
            href="/aboutthis.html" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            About us
          </a>
          <span>•</span>
          <a 
            href="/terms.html" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            Terms
          </a>
          <span>•</span>
          <a 
            href="/userprivacy.html" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            Privacy
          </a>
        </div>
      </div>
    </aside>
  );
};

export default SideMenu;
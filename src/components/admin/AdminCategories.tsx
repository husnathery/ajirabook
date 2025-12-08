import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Trash2, GripVertical, Edit2, Check, X } from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  visible_in_menu: boolean;
  menu_order: number;
}

const AdminCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("menu_order", { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    try {
      const { error } = await supabase.from("categories").insert({
        name: newCategoryName,
        visible_in_menu: true,
        menu_order: categories.length,
      });

      if (error) throw error;

      toast.success("Category created");
      setNewCategoryName("");
      fetchCategories();
    } catch (error) {
      console.error("Error creating category:", error);
      toast.error("Failed to create category");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("categories").delete().eq("id", id);

      if (error) throw error;

      toast.success("Category deleted");
      fetchCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Failed to delete category");
    }
  };

  const handleToggleVisibility = async (id: string, visible: boolean) => {
    try {
      const { error } = await supabase
        .from("categories")
        .update({ visible_in_menu: visible })
        .eq("id", id);

      if (error) throw error;

      toast.success(`Category ${visible ? "shown" : "hidden"} in menu`);
      fetchCategories();
    } catch (error) {
      console.error("Error updating category:", error);
      toast.error("Failed to update category");
    }
  };

  const handleReorder = async (id: string, newOrder: number) => {
    try {
      const { error } = await supabase
        .from("categories")
        .update({ menu_order: newOrder })
        .eq("id", id);

      if (error) throw error;
      fetchCategories();
    } catch (error) {
      console.error("Error reordering category:", error);
      toast.error("Failed to reorder category");
    }
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setEditingName(category.name);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingName.trim()) {
      toast.error("Category name cannot be empty");
      return;
    }

    try {
      const { error } = await supabase
        .from("categories")
        .update({ name: editingName })
        .eq("id", id);

      if (error) throw error;

      toast.success("Category updated");
      setEditingId(null);
      setEditingName("");
      fetchCategories();
    } catch (error) {
      console.error("Error updating category:", error);
      toast.error("Failed to update category");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create Category */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <Label>Create New Category</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Category name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
            />
            <Button onClick={handleCreate}>Create</Button>
          </div>
        </CardContent>
      </Card>

      {/* Categories List */}
      {categories.map((category, index) => (
        <Card key={category.id}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <GripVertical className="h-5 w-5 text-muted-foreground" />
              
              <div className="flex-1">
                {editingId === category.id ? (
                  <div className="flex gap-2 items-center">
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="h-8"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleSaveEdit(category.id)}
                    >
                      <Check className="h-4 w-4 text-green-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCancelEdit}
                    >
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="font-medium">{category.name}</p>
                    <p className="text-xs text-muted-foreground">Order: {category.menu_order}</p>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor={`visible-${category.id}`} className="text-xs">
                  Show in menu
                </Label>
                <Switch
                  id={`visible-${category.id}`}
                  checked={category.visible_in_menu}
                  onCheckedChange={(checked) =>
                    handleToggleVisibility(category.id, checked)
                  }
                />
              </div>

              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleReorder(category.id, Math.max(0, category.menu_order - 1))}
                  disabled={index === 0}
                >
                  ↑
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleReorder(category.id, category.menu_order + 1)}
                  disabled={index === categories.length - 1}
                >
                  ↓
                </Button>
              </div>

              {editingId !== category.id && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(category)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(category.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AdminCategories;

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const AdminSettings = () => {
  const [requireBookReview, setRequireBookReview] = useState(false);
  const [enableAdSense, setEnableAdSense] = useState(false);
  const [inFeedAdCode, setInFeedAdCode] = useState("");
  const [displayAdCode, setDisplayAdCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      // Fetch admin settings
      const { data: reviewData } = await supabase
        .from("admin_settings")
        .select("*")
        .eq("setting_key", "require_book_review")
        .single();

      if (reviewData) {
        setRequireBookReview(reviewData.setting_value);
      }

      const { data: adSenseData } = await supabase
        .from("admin_settings")
        .select("*")
        .eq("setting_key", "enable_adsense")
        .single();

      if (adSenseData) {
        setEnableAdSense(adSenseData.setting_value);
      }

      // Fetch AdSense codes
      const { data: inFeedAd } = await supabase
        .from("adsense_settings")
        .select("ad_code")
        .eq("ad_type", "in-feed")
        .single();

      if (inFeedAd) {
        setInFeedAdCode(inFeedAd.ad_code);
      }

      const { data: displayAd } = await supabase
        .from("adsense_settings")
        .select("ad_code")
        .eq("ad_type", "display")
        .single();

      if (displayAd) {
        setDisplayAdCode(displayAd.ad_code);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleReview = async (checked: boolean) => {
    try {
      const { error } = await supabase
        .from("admin_settings")
        .update({ setting_value: checked })
        .eq("setting_key", "require_book_review");

      if (error) throw error;

      setRequireBookReview(checked);
      toast.success(`Book review requirement ${checked ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error("Error updating setting:", error);
      toast.error("Failed to update setting");
    }
  };

  const handleToggleAdSense = async (checked: boolean) => {
    try {
      const { error } = await supabase
        .from("admin_settings")
        .update({ setting_value: checked })
        .eq("setting_key", "enable_adsense");

      if (error) throw error;

      setEnableAdSense(checked);
      toast.success(`AdSense ${checked ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error("Error updating setting:", error);
      toast.error("Failed to update setting");
    }
  };

  const handleSaveAdCodes = async () => {
    try {
      setSaving(true);

      // Upsert in-feed ad
      if (inFeedAdCode.trim()) {
        const { error: inFeedError } = await supabase
          .from("adsense_settings")
          .upsert({
            ad_type: "in-feed",
            ad_code: inFeedAdCode,
            is_active: true,
          }, {
            onConflict: "ad_type"
          });

        if (inFeedError) throw inFeedError;
      }

      // Upsert display ad
      if (displayAdCode.trim()) {
        const { error: displayError } = await supabase
          .from("adsense_settings")
          .upsert({
            ad_type: "display",
            ad_code: displayAdCode,
            is_active: true,
          }, {
            onConflict: "ad_type"
          });

        if (displayError) throw displayError;
      }

      toast.success("AdSense codes saved successfully");
    } catch (error) {
      console.error("Error saving ad codes:", error);
      toast.error("Failed to save ad codes");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Admin Settings</CardTitle>
          <CardDescription>Configure platform-wide settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor="book-review">Book Review Requirement</Label>
              <p className="text-sm text-muted-foreground">
                When enabled, all newly uploaded books must be reviewed and approved by an admin before appearing in the feed
              </p>
            </div>
            <Switch
              id="book-review"
              checked={requireBookReview}
              onCheckedChange={handleToggleReview}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AdSense Configuration</CardTitle>
          <CardDescription>Manage Google AdSense integration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor="enable-adsense">Enable AdSense</Label>
              <p className="text-sm text-muted-foreground">
                Show Google AdSense ads throughout the application
              </p>
            </div>
            <Switch
              id="enable-adsense"
              checked={enableAdSense}
              onCheckedChange={handleToggleAdSense}
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="in-feed-ad">In-Feed Ad Code</Label>
              <p className="text-sm text-muted-foreground">
                Paste the complete AdSense in-feed ad code (shown between book rows)
              </p>
              <Textarea
                id="in-feed-ad"
                value={inFeedAdCode}
                onChange={(e) => setInFeedAdCode(e.target.value)}
                placeholder="<script>...</script>"
                className="font-mono text-xs min-h-[150px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="display-ad">Display Ad Code</Label>
              <p className="text-sm text-muted-foreground">
                Paste the complete AdSense display ad code (shown in PDF reader)
              </p>
              <Textarea
                id="display-ad"
                value={displayAdCode}
                onChange={(e) => setDisplayAdCode(e.target.value)}
                placeholder="<script>...</script>"
                className="font-mono text-xs min-h-[150px]"
              />
            </div>

            <Button onClick={handleSaveAdCodes} disabled={saving}>
              {saving ? "Saving..." : "Save Ad Codes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;

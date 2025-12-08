import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AdSenseAdProps {
  adType: "in-feed" | "display";
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

const AdSenseAd = ({ adType, className = "" }: AdSenseAdProps) => {
  const adRef = useRef<HTMLModElement>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [adSlot, setAdSlot] = useState<string | null>(null);
  const [adClient, setAdClient] = useState<string | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const pushedRef = useRef(false);

  useEffect(() => {
    const fetchAdSettings = async () => {
      try {
        // Check if AdSense is enabled
        const { data: enabledData } = await supabase
          .from("admin_settings")
          .select("setting_value")
          .eq("setting_key", "enable_adsense")
          .single();

        if (!enabledData?.setting_value) {
          setIsEnabled(false);
          setSettingsLoaded(true);
          return;
        }

        setIsEnabled(true);

        // Fetch the ad code to extract slot and client
        const { data } = await supabase
          .from("adsense_settings")
          .select("ad_code")
          .eq("ad_type", adType)
          .eq("is_active", true)
          .single();

        if (data?.ad_code) {
          // Extract data-ad-slot and data-ad-client from the ad code
          const slotMatch = data.ad_code.match(/data-ad-slot="([^"]+)"/);
          const clientMatch = data.ad_code.match(/data-ad-client="([^"]+)"/);
          
          if (slotMatch && clientMatch) {
            setAdSlot(slotMatch[1]);
            setAdClient(clientMatch[1]);
          }
        }
      } catch (error) {
        console.error("Error fetching ad settings:", error);
      } finally {
        setSettingsLoaded(true);
      }
    };

    fetchAdSettings();
  }, [adType]);

  useEffect(() => {
    if (isEnabled && adSlot && adClient && adRef.current && settingsLoaded && !pushedRef.current) {
      // Mark as pushed to prevent duplicate pushes
      pushedRef.current = true;
      
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        try {
          window.adsbygoogle = window.adsbygoogle || [];
          window.adsbygoogle.push({});
        } catch (e) {
          console.error("AdSense error:", e);
        }
      });
    }
  }, [isEnabled, adSlot, adClient, settingsLoaded]);

  if (!settingsLoaded || !isEnabled || !adSlot || !adClient) {
    return null;
  }

  return (
    <div className={className}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: "block", minHeight: "100px" }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
};

export default AdSenseAd;

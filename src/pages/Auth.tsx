import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const TANZANIA_REGIONS = [
  "Arusha", "Dar es Salaam", "Dodoma", "Geita", "Iringa", "Kagera",
  "Katavi", "Kigoma", "Kilimanjaro", "Lindi", "Manyara", "Mara",
  "Mbeya", "Morogoro", "Mtwara", "Mwanza", "Njombe", "Pemba North",
  "Pemba South", "Pwani", "Rukwa", "Ruvuma", "Shinyanga", "Simiyu",
  "Singida", "Songwe", "Tabora", "Tanga", "Zanzibar North",
  "Zanzibar South", "Zanzibar West"
];

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const navigate = useNavigate();

  // Form state
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [region, setRegion] = useState("");
  const [accountType, setAccountType] = useState<"seller" | "buyer">("buyer");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone.match(/^(07|06)\d{8}$/)) {
      toast.error("Phone number must start with 07 or 06 and be 10 digits");
      return;
    }

    if (!region) {
      toast.error("Please select a region");
      return;
    }

    setLoading(true);
    try {
      // Create user directly without OTP
      const email = `${phone}@vitabu.app`;
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            phone,
            region,
            account_type: accountType,
          },
        },
      });

      if (signUpError) throw signUpError;

      toast.success("Account created successfully!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const email = `${phone}@vitabu.app`;
      
      // Check if it's a temporary password
      const { data: tempPwd } = await supabase
        .from("temporary_passwords")
        .select("*")
        .eq("phone", phone)
        .eq("temp_password", password)
        .eq("used", false)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (tempPwd) {
        // Get user profile to find the actual user email
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("phone", phone)
          .single();

        if (profile) {
          // Login using the temporary password
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password: tempPwd.temp_password, // Use the temp password from DB
          });

          if (error) throw error;

          // Mark temp password as used
          await supabase
            .from("temporary_passwords")
            .update({ used: true })
            .eq("id", tempPwd.id);

          toast.success("Welcome back! Please change your password in Settings");
          navigate("/dashboard");
          return;
        }
      }

      // Normal login
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!phone.match(/^(07|06)\d{8}$/)) {
      toast.error("Please enter a valid phone number");
      return;
    }

    try {
      const { error } = await supabase.functions.invoke("send-temp-password", {
        body: { phone },
      });

      if (error) throw error;
      toast.success("Temporary password sent to your phone!");
    } catch (error: any) {
      toast.error(error.message || "Failed to send temporary password");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-2xl p-6 border border-border shadow-[var(--shadow-elevated)]">
        <h2 className="text-2xl font-bold text-center mb-6 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
          {isLogin ? "Login" : "Create Account"}
        </h2>

        {isLogin ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="07XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={10}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="button"
              variant="link"
              className="px-0 h-auto text-sm"
              onClick={handleForgotPassword}
            >
              Forgot password?
            </Button>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="07XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={10}
                required
              />
            </div>
            <div>
              <Label htmlFor="region">Region</Label>
              <Select value={region} onValueChange={setRegion} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {TANZANIA_REGIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Account Type</Label>
              <RadioGroup value={accountType} onValueChange={(value: any) => setAccountType(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="buyer" id="buyer" />
                  <Label htmlFor="buyer">Msomaji</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="seller" id="seller" />
                  <Label htmlFor="seller">Mwandishi</Label>
                </div>
              </RadioGroup>
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating Account..." : "Sign Up"}
            </Button>
          </form>
        )}

        <div className="mt-4 text-center">
          <Button
            variant="link"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? "Need an account? Sign up" : "Already have an account? Login"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
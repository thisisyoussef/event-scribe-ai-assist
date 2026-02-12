import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Heart, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const redirectTo = ((): string => {
    try {
      const url = new URL(window.location.href);
      return url.searchParams.get("redirect") || "/dashboard";
    } catch {
      return "/dashboard";
    }
  })();

  useEffect(() => {
    // Check if we have the necessary tokens for password reset
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    
    if (!accessToken || !refreshToken) {
      setError("Invalid password reset link. Please request a new one.");
      return;
    }

    // Set the session with the tokens
    const setSession = async () => {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        console.error('Session error:', error);
        setError("Invalid or expired password reset link. Please request a new one.");
      }
    };

    setSession();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error('Password update error:', error);
        setError(error.message);
      } else {
        setSuccess(true);
        toast({
          title: "Password Updated",
          description: "Your password has been successfully updated. You can now sign in with your new password.",
        });
        
        // Redirect after a short delay
        setTimeout(() => {
          navigate(redirectTo, { replace: true });
        }, 1500);
      }
    } catch (error) {
      console.error('Password reset error:', error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (error && !searchParams.get('access_token')) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-white/10 bg-white/5 backdrop-blur-xl shadow-xl golden-glow">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto w-12 h-12 bg-red-500/100/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <CardTitle className="text-2xl text-foreground">Invalid Link</CardTitle>
            <CardDescription className="text-white/50">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button
              onClick={() => navigate("/login")}
              className="bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-300 hover:to-gold-400 text-white"
            >
              Return to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-white/10 bg-white/5 backdrop-blur-xl shadow-xl golden-glow">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto w-12 h-12 bg-emerald-500/15 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            </div>
            <CardTitle className="text-2xl text-foreground">Password Updated!</CardTitle>
            <CardDescription className="text-white/50">
              Your password has been successfully updated. Redirecting you to login...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Logo */}
      <div className="absolute top-8 left-8 flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-gold-400 to-gold-500 rounded-xl flex items-center justify-center shadow-lg">
          <Heart className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-gold-400 to-gold-300 bg-clip-text text-transparent">
          EasyEvent
        </h1>
      </div>

      <Card className="w-full max-w-md border-white/10 bg-white/5 backdrop-blur-xl shadow-xl golden-glow">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl text-foreground">Set New Password</CardTitle>
          <CardDescription className="text-white/50">
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-white/15 focus:border-gold-400"
                minLength={6}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="border-white/15 focus:border-gold-400"
                minLength={6}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-300 hover:to-gold-400 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              disabled={loading}
            >
              {loading ? "Updating Password..." : "Update Password"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="text-white/50 hover:text-white/70 hover:underline font-medium"
            >
              Back to Login
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;

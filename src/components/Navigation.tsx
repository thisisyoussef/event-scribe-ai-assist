
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { Calendar, Phone, Settings, LogOut, Menu, X, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (event === 'SIGNED_OUT') {
          navigate("/login");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    setLoading(true);
    try {
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        toast({
          title: "Sign Out Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        // Clear any localStorage data
        localStorage.removeItem("user");

        toast({
          title: "Signed Out",
          description: "You've been successfully signed out.",
        });

        // Navigate to login page
        navigate("/login");
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred during sign out.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const navItems = [
    { label: "Events", path: "/dashboard", icon: Calendar },
    { label: "Templates", path: "/templates", icon: FileText },
    { label: "Contacts", path: "/contacts", icon: Phone },
    { label: "Settings", path: "/settings", icon: Settings },
  ];

  // Get display name from user metadata or email
  const displayName = user?.user_metadata?.full_name ||
                     user?.user_metadata?.name ||
                     user?.email?.split('@')[0] ||
                     "Organizer";

  return (
    <header className="bg-navy-800/80 backdrop-blur-xl border-b border-gold-400/15 shadow-lg shadow-black/20">
      <div className="container mx-auto px-4">
        <div className="relative flex justify-between md:justify-between items-center h-16">
          {/* Logo + Crescent */}
          <div className="flex items-center space-x-3 flex-1 md:flex-none justify-center md:justify-start">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <div className="crescent-moon mr-1" />
              <span className="text-lg font-semibold text-gold-300 tracking-wide">UMMA Stewards</span>
            </button>
          </div>

          {/* Desktop Navigation - Centered */}
          <nav className="hidden md:flex items-center space-x-2 absolute left-1/2 transform -translate-x-1/2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-200 ${
                    isActive
                      ? "bg-gold-400/15 text-gold-300 shadow-sm golden-border"
                      : "text-white/60 hover:text-gold-300 hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium text-sm">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            <span className="text-sm text-gold-200/70 font-medium">
              {displayName}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              disabled={loading}
              className="border-white/15 text-white/70 hover:bg-white/5 hover:text-gold-300 hover:border-gold-400/30 bg-transparent"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {loading ? "Signing Out..." : "Sign Out"}
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="absolute right-4 md:relative md:right-auto md:hidden text-gold-300"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gold-400/10 py-4 bg-navy-800/95 backdrop-blur-xl">
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      isActive
                        ? "bg-gold-400/15 text-gold-300"
                        : "text-white/60 hover:text-gold-300 hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
              <div className="border-t border-gold-400/10 pt-4 mt-4">
                <p className="text-sm text-gold-200/70 px-4 pb-2 font-medium">
                  {displayName}
                </p>
                <button
                  onClick={handleLogout}
                  disabled={loading}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-white/60 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200 disabled:opacity-50"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">
                    {loading ? "Signing Out..." : "Sign Out"}
                  </span>
                </button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navigation;

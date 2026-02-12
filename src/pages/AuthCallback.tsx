import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [message, setMessage] = useState("Finalizing sign-in…");

  // Ensure a matching contact exists for the signed-in POC (create/update by phone)
  const ensurePocContact = async () => {
    try {
      const { data: userResp, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userResp?.user) return;
      const user = userResp.user;
      const md: any = user.user_metadata || {};
      const phone: string | undefined = md.phone;
      const fullName: string = md.full_name || "";
      const gender: string | null = md.gender || null;
      const email: string | null = user.email || null;

      if (!phone) return; // Nothing to do without phone

      // Upsert by phone so manual contacts are updated instead of duplicated
      const { error: upsertErr } = await supabase
        .from('contacts')
        .upsert(
          [{
            name: fullName,
            phone,
            email,
            gender,
            source: 'account_signup',
            user_id: user.id,
            role: 'poc',
            updated_at: new Date().toISOString(),
          }],
          { onConflict: 'phone' }
        );

      if (upsertErr) {
        // Don't block navigation, but log for debugging
        // eslint-disable-next-line no-console
        console.error('ensurePocContact upsert error:', upsertErr);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('ensurePocContact unexpected error:', e);
    }
  };

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const isHashFlow = (window.location.hash || "").includes("access_token=");
        const url = new URL(window.location.href);
        const redirectParam = url.searchParams.get("redirect") || "/dashboard";

        if (isHashFlow) {
          setMessage("Verifying your session…");
          // Parse tokens from the URL hash (implicit flow)
          const hash = window.location.hash.startsWith("#") ? window.location.hash.substring(1) : window.location.hash;
          const params = new URLSearchParams(hash);
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");

          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) throw error;
            // Clean up the hash to avoid leaking tokens in history
            window.history.replaceState(null, document.title, window.location.pathname + window.location.search);

            // Ensure the contact exists now that we're authenticated
            await ensurePocContact();

            toast({ title: "Welcome", description: "You're signed in." });
            navigate(redirectParam, { replace: true });
            return;
          }
          // If tokens are missing in hash, treat as invalid/expired link
          toast({
            title: "Link no longer valid",
            description: "That sign-in link may have been used already or expired. Please sign in again.",
          });
          navigate(`/login?notice=link_expired`, { replace: true });
          return;
        } else {
          setMessage("Exchanging verification code…");
          const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (error) throw error;
          if (data?.session) {
            // Ensure the contact exists now that we're authenticated
            await ensurePocContact();

            toast({ title: "Welcome", description: "You're signed in." });
            navigate(redirectParam, { replace: true });
            return;
          }
          // If no session was returned, consider it invalid/expired
          toast({
            title: "Link no longer valid",
            description: "That sign-in link was already used or has expired. Please sign in again.",
          });
          navigate(`/login?notice=link_expired`, { replace: true });
          return;
        }

        setMessage("We couldn't complete sign-in. Redirecting to login…");
        setTimeout(() => navigate("/login", { replace: true }), 1200);
      } catch (err: any) {
        console.error("Auth callback error:", err);
        const message = String(err?.message || "").toLowerCase();
        if (message.includes("auth code") && message.includes("code verifier")) {
          toast({
            title: "Link no longer valid",
            description: "That sign-in link was already used or has expired. Please sign in again.",
          });
          navigate(`/login?notice=link_expired`, { replace: true });
          return;
        }
        toast({ title: "Sign-in failed", description: "We couldn't complete sign-in. Please try again.", variant: "destructive" });
        navigate("/login?notice=invalid_callback", { replace: true });
      }
    };

    handleAuth();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center">
        <div className="w-6 h-6 mx-auto mb-3 border-2 border-gray-300 border-t-[#5c5b2f] rounded-full animate-spin" />
        <div className="text-gray-700 mb-2">{message}</div>
        <div className="text-sm text-gray-500">
          If this takes more than a few seconds,
          <button className="ml-1 text-[#5c5b2f] underline" onClick={() => navigate("/login", { replace: true })}>continue to login</button>.
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;



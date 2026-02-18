import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, supabaseConfigured } from '@/lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!supabaseConfigured) {
      navigate('/', { replace: true });
      return;
    }

    const handleCallback = async () => {
      // Handle PKCE flow (code in query string)
      if (window.location.search.includes('code=')) {
        await supabase.auth.exchangeCodeForSession(window.location.search);
      }

      // Verify session is established
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // Wait a moment for implicit flow auto-detection
        await new Promise(r => setTimeout(r, 500));
      }

      navigate('/', { replace: true });
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-10 h-10 border-3 border-t-cyan-400 border-cyan-400/20 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Wallet } from "lucide-react";

interface StripeConnectButtonProps {
  hasConnectAccount: boolean;
}

export const StripeConnectButton = ({ hasConnectAccount }: StripeConnectButtonProps) => {
  const [loading, setLoading] = useState(false);

  const handleSetupPayouts = async () => {
    setLoading(true);
    
    // Show loading toast immediately
    const loadingToast = toast.loading(hasConnectAccount 
      ? 'Pripravljam Stripe nastavitve...' 
      : 'Pripravljam Stripe povezavo...'
    );
    
    try {
      // Call function with shorter timeout
      const { data, error } = await supabase.functions.invoke('create-connect-account', {
        body: {},
      });

      if (error) {
        console.error('[StripeConnectButton] Supabase function error:', error);
        throw error;
      }

      // Check for error in response data
      if (data?.error) {
        console.error('[StripeConnectButton] Backend error:', data.error);
        throw new Error(data.error);
      }

      if (data?.url) {
        // Open in same window so return URL works properly
        window.location.href = data.url;
        toast.success(hasConnectAccount 
          ? 'Preusmerjam na Stripe nastavitve...' 
          : 'Preusmerjam na Stripe povezavo...',
          { id: loadingToast }
        );
      } else {
        console.error('[StripeConnectButton] No URL in response:', data);
        throw new Error('Ni dobljen URL za Stripe nastavitve');
      }
    } catch (error: any) {
      console.error('[StripeConnectButton] Error:', error);
      const errorMessage = error.message || 'Napaka pri nastavitvi izplačil';
      toast.error(errorMessage, { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleSetupPayouts}
      disabled={loading}
      variant={hasConnectAccount ? "outline" : "default"}
      className="w-full"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
      ) : (
        <Wallet className="w-4 h-4 mr-2" />
      )}
      {hasConnectAccount ? 'Uredi izplačila' : 'Nastavi izplačila (Stripe)'}
    </Button>
  );
};

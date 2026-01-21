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

      if (error) throw error;

      if (data?.url) {
        // Immediately open window without waiting
        window.open(data.url, '_blank');
        toast.success(hasConnectAccount 
          ? 'Stripe nastavitve odprte!' 
          : 'Stripe povezava odprta!',
          { id: loadingToast }
        );
      }
    } catch (error: any) {
      console.error('Error setting up payouts:', error);
      toast.error('Napaka pri nastavitvi izplačil. Poskusi ponovno.', { id: loadingToast });
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

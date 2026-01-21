import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CreditCard, Building2, Wallet, CheckCircle2 } from "lucide-react";

interface PayoutInfo {
  method?: 'stripe' | 'iban' | 'paypal' | 'revolut';
  iban?: string;
  paypal_email?: string;
  revolut_tag?: string;
  [key: string]: string | undefined;
}

interface PayoutSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
  currentPayoutInfo: PayoutInfo | null;
  hasStripeConnect: boolean;
  onSaved: () => void;
}

export const PayoutSettingsModal = ({
  open,
  onOpenChange,
  userId,
  userEmail,
  currentPayoutInfo,
  hasStripeConnect,
  onSaved,
}: PayoutSettingsModalProps) => {
  const [saving, setSaving] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [method, setMethod] = useState<'stripe' | 'iban' | 'paypal' | 'revolut'>(
    (currentPayoutInfo?.method as 'stripe' | 'iban' | 'paypal' | 'revolut') || (hasStripeConnect ? 'stripe' : 'iban')
  );
  const [iban, setIban] = useState(currentPayoutInfo?.iban || "");
  const [paypalEmail, setPaypalEmail] = useState(currentPayoutInfo?.paypal_email || "");
  const [revolutTag, setRevolutTag] = useState(currentPayoutInfo?.revolut_tag || "");

  // Update state when modal opens with new data
  useEffect(() => {
    if (open) {
      setMethod((currentPayoutInfo?.method as 'stripe' | 'iban' | 'paypal' | 'revolut') || (hasStripeConnect ? 'stripe' : 'iban'));
      setIban(currentPayoutInfo?.iban || "");
      setPaypalEmail(currentPayoutInfo?.paypal_email || "");
      setRevolutTag(currentPayoutInfo?.revolut_tag || "");
    }
  }, [open, currentPayoutInfo, hasStripeConnect]);

  // IBAN validation (basic pattern)
  const isValidIban = (value: string): boolean => {
    // Basic IBAN: 2 letters + 2 digits + up to 30 alphanumeric
    const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/;
    return ibanRegex.test(value.replace(/\s/g, '').toUpperCase());
  };

  // Email validation
  const isValidEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  // Mask IBAN for display (show only last 4 chars)
  const maskIban = (value: string): string => {
    if (!value || value.length <= 4) return value;
    const cleaned = value.replace(/\s/g, '');
    return '****' + cleaned.slice(-4);
  };

  const handleStripeConnect = async () => {
    setConnectLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-connect-account');
      
      if (error) throw error;
      
      if (data?.url) {
        // Save method preference before redirect
        await supabase
          .from("profiles")
          .update({ payout_info: { method: 'stripe' } })
          .eq("id", userId);
        
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('Error setting up Stripe Connect:', error);
      toast.error('Napaka pri nastavitvi Stripe računa');
    } finally {
      setConnectLoading(false);
    }
  };

  const handleSaveManualPayout = async () => {
    // Validate based on method
    if (method === 'iban') {
      if (!iban.trim()) {
        toast.error('Vnesi IBAN');
        return;
      }
      if (!isValidIban(iban)) {
        toast.error('Neveljaven format IBAN');
        return;
      }
    } else if (method === 'paypal') {
      if (!paypalEmail.trim()) {
        toast.error('Vnesi PayPal email');
        return;
      }
      if (!isValidEmail(paypalEmail)) {
        toast.error('Neveljaven email naslov');
        return;
      }
    } else if (method === 'revolut') {
      if (!revolutTag.trim()) {
        toast.error('Vnesi Revolut oznako');
        return;
      }
    }

    setSaving(true);
    try {
      const payoutInfoData: Record<string, string> = { method };
      
      if (method === 'iban') {
        payoutInfoData.iban = iban.replace(/\s/g, '').toUpperCase();
      } else if (method === 'paypal') {
        payoutInfoData.paypal_email = paypalEmail.trim().toLowerCase();
      } else if (method === 'revolut') {
        payoutInfoData.revolut_tag = revolutTag.trim();
      }

      const { error } = await supabase
        .from("profiles")
        .update({ payout_info: payoutInfoData })
        .eq("id", userId);

      if (error) throw error;

      toast.success('Izplačila nastavljena — zdaj lahko objaviš zapiske.');
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving payout info:', error);
      toast.error('Napaka pri shranjevanju');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">Podatki za izplačila</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Izberi način izplačila za zaslužek od prodaje zapiskov
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Method Selection */}
          <RadioGroup value={method} onValueChange={(v) => setMethod(v as any)} className="space-y-3">
            {/* Stripe Connect Option */}
            <div className={`flex items-start space-x-3 p-4 rounded-xl border transition-all ${
              method === 'stripe' 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            }`}>
              <RadioGroupItem value="stripe" id="stripe" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="stripe" className="flex items-center gap-2 text-foreground font-medium cursor-pointer">
                  <CreditCard className="w-4 h-4 text-primary" />
                  Stripe Connect
                  {hasStripeConnect && (
                    <span className="text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
                      Povezano
                    </span>
                  )}
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Avtomatska izplačila na bančni račun. Priporočeno za redno prodajo.
                </p>
                {method === 'stripe' && (
                  <div className="mt-3">
                    {hasStripeConnect ? (
                      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                        <CheckCircle2 className="w-4 h-4" />
                        Stripe račun je povezan
                      </div>
                    ) : (
                      <Button
                        onClick={handleStripeConnect}
                        disabled={connectLoading}
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white"
                      >
                        {connectLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Wallet className="w-4 h-4 mr-2" />
                        )}
                        Poveži Stripe račun
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* IBAN Option */}
            <div className={`flex items-start space-x-3 p-4 rounded-xl border transition-all ${
              method === 'iban' 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            }`}>
              <RadioGroupItem value="iban" id="iban" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="iban" className="flex items-center gap-2 text-foreground font-medium cursor-pointer">
                  <Building2 className="w-4 h-4 text-primary" />
                  Bančni račun (IBAN)
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Ročno nakazilo na tvoj bančni račun
                </p>
                {method === 'iban' && (
                  <div className="mt-3 space-y-2">
                    <Input
                      placeholder="SI56 0123 4567 8901 234"
                      value={iban}
                      onChange={(e) => setIban(e.target.value)}
                      className="bg-input text-foreground placeholder:text-muted-foreground font-mono"
                    />
                    {currentPayoutInfo?.iban && (
                      <p className="text-xs text-muted-foreground">
                        Trenutni: {maskIban(currentPayoutInfo.iban)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* PayPal Option */}
            <div className={`flex items-start space-x-3 p-4 rounded-xl border transition-all ${
              method === 'paypal' 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            }`}>
              <RadioGroupItem value="paypal" id="paypal" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="paypal" className="flex items-center gap-2 text-foreground font-medium cursor-pointer">
                  <Wallet className="w-4 h-4 text-blue-500" />
                  PayPal
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Izplačilo na PayPal račun
                </p>
                {method === 'paypal' && (
                  <div className="mt-3">
                    <Input
                      type="email"
                      placeholder="tvoj@email.com"
                      value={paypalEmail}
                      onChange={(e) => setPaypalEmail(e.target.value)}
                      className="bg-input text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Revolut Option */}
            <div className={`flex items-start space-x-3 p-4 rounded-xl border transition-all ${
              method === 'revolut' 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            }`}>
              <RadioGroupItem value="revolut" id="revolut" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="revolut" className="flex items-center gap-2 text-foreground font-medium cursor-pointer">
                  <Wallet className="w-4 h-4 text-purple-500" />
                  Revolut
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Izplačilo na Revolut račun
                </p>
                {method === 'revolut' && (
                  <div className="mt-3">
                    <Input
                      placeholder="@uporabnisko_ime"
                      value={revolutTag}
                      onChange={(e) => setRevolutTag(e.target.value)}
                      className="bg-input text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                )}
              </div>
            </div>
          </RadioGroup>

          {/* Save Button for manual methods */}
          {method !== 'stripe' && (
            <Button
              onClick={handleSaveManualPayout}
              disabled={saving}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Shranjujem...
                </>
              ) : (
                'Shrani podatke za izplačila'
              )}
            </Button>
          )}

          {/* Info text */}
          <p className="text-xs text-muted-foreground">
            Izplačila so izvedena mesečno za vse zaslužke nad 10€. 
            Stripe Connect omogoča avtomatska izplačila, ostale metode pa zahtevajo ročno obdelavo.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

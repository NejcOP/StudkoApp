
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ConfirmEmail = () => {
  const [status, setStatus] = useState<"pending" | "success" | "error" | "need-email">("pending");
  const [message, setMessage] = useState<string>("");
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const confirm = async (emailParam?: string) => {
      const token = searchParams.get("token");
      const type = searchParams.get("type");
      const emailFromUrl = searchParams.get("email") || emailParam;
      if (!token || !type) {
        setStatus("error");
        setMessage("Manjkajoč ali neveljaven potrditveni link.");
        return;
      }
      if (!emailFromUrl) {
        setStatus("need-email");
        setMessage("Za potrditev potrebujemo še tvoj e-naslov.");
        return;
      }
      setStatus("pending");
      setMessage("");
      const { error } = await supabase.auth.verifyOtp({
        token,
        type: type === "signup" ? "signup" : type,
        email: emailFromUrl,
      });
      if (error) {
        setStatus("error");
        setMessage("Napaka pri potrditvi: " + error.message);
      } else {
        setStatus("success");
        setMessage("E-naslov uspešno potrjen! Sedaj se lahko prijaviš.");
        setTimeout(() => navigate("/login"), 2000);
      }
    };
    const emailFromUrl = searchParams.get("email");
    if (emailFromUrl) {
      setEmail(emailFromUrl);
      confirm(emailFromUrl);
    } else {
      confirm();
    }
    // eslint-disable-next-line
  }, []);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 100)); // UI feedback
    await (async () => {
      const token = searchParams.get("token");
      const type = searchParams.get("type");
      if (!token || !type || !email) return;
      setStatus("pending");
      setMessage("");
      const { error } = await supabase.auth.verifyOtp({
        token,
        type: type === "signup" ? "signup" : type,
        email,
      });
      if (error) {
        setStatus("error");
        setMessage("Napaka pri potrditvi: " + error.message);
      } else {
        setStatus("success");
        setMessage("E-naslov uspešno potrjen! Sedaj se lahko prijaviš.");
        setTimeout(() => navigate("/login"), 2000);
      }
    })();
    setSubmitting(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      {status === "pending" && (
        <>
          <Loader2 className="animate-spin w-10 h-10 mb-4 text-purple-600" />
          <p>Potrjujem e-naslov ...</p>
        </>
      )}
      {status === "need-email" && (
        <form onSubmit={handleEmailSubmit} className="flex flex-col items-center gap-4">
          <XCircle className="w-10 h-10 mb-4 text-yellow-600" />
          <p>{message}</p>
          <Input
            type="email"
            placeholder="Vnesi svoj e-naslov"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="min-w-[260px]"
          />
          <Button type="submit" disabled={submitting || !email} className="mt-2">Potrdi e-naslov</Button>
        </form>
      )}
      {status === "success" && (
        <>
          <CheckCircle2 className="w-10 h-10 mb-4 text-green-600" />
          <p>{message}</p>
          <Button className="mt-4" onClick={() => navigate("/login")}>Na prijavo</Button>
        </>
      )}
      {status === "error" && (
        <>
          <XCircle className="w-10 h-10 mb-4 text-red-600" />
          <p>{message}</p>
          <Button className="mt-4" onClick={() => navigate("/login")}>Na prijavo</Button>
        </>
      )}
    </div>
  );
};

export default ConfirmEmail;

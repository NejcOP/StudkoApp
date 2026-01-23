import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const ConfirmEmail = () => {
  const [status, setStatus] = useState<"pending" | "success" | "error">("pending");
  const [message, setMessage] = useState<string>("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const confirm = async () => {
      const token = searchParams.get("token");
      const type = searchParams.get("type");
      if (!token || !type) {
        setStatus("error");
        setMessage("Manjkajoč ali neveljaven potrditveni link.");
        return;
      }
      // Poskusi potrditi uporabnika preko Supabase
      const { error } = await supabase.auth.verifyOtp({
        token,
        type: type === "signup" ? "signup" : type,
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
    confirm();
    // eslint-disable-next-line
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      {status === "pending" && (
        <>
          <Loader2 className="animate-spin w-10 h-10 mb-4 text-purple-600" />
          <p>Potrjujem e-naslov ...</p>
        </>
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

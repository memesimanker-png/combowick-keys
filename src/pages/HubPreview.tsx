import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useIsAdmin } from "@/hooks/useAuth";
import { HubDemo } from "@/components/HubDemo";

// /admin/hub-preview — admin tool around the shared HubDemo (all switches + Streamer Mode preview).
export default function HubPreview() {
  const { isAdmin, loading } = useIsAdmin();
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-black"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!isAdmin) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-black text-center">
      <p className="text-lg font-bold">Admins only</p>
      <Link to="/login" className="text-primary underline">Sign in</Link>
    </div>
  );
  return <HubDemo admin />;
}

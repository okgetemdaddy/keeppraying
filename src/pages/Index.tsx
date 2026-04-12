import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import LaunchOverlay from "@/components/LaunchOverlay";

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users to Prayer Station
  useEffect(() => {
    if (!loading && user) {
      navigate("/board", { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) return null;
  if (user) return null; // will redirect via useEffect

  return <LaunchOverlay />;
}

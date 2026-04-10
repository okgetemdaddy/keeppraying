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
      const key = "kp_board_redirected";
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        navigate("/board", { replace: true });
      }
    }
  }, [user, loading, navigate]);

  // Authenticated users who've already been redirected once can still see board
  if (user) {
    navigate("/board", { replace: true });
    return null;
  }

  return <LaunchOverlay />;
}

import { useLocation } from "react-router-dom";

export function useBackLink(): { to: string; label: string } | null {
  const location = useLocation();
  const from = (location.state as { from?: string })?.from;

  if (from === "board") return { to: "/board", label: "Back to My Board" };
  if (from === "profile") return { to: "/profile", label: "Back to My Profile" };
  return null;
}

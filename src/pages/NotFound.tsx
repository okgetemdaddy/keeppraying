import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Compass, Home, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center space-y-6">
        {/* Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          <Compass className="h-10 w-10 text-muted-foreground" strokeWidth={1.4} />
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-semibold text-foreground leading-snug">
          This path doesn't seem to lead anywhere
        </h1>

        {/* Subtext */}
        <p className="text-muted-foreground text-base leading-relaxed">
          Even when we feel lost, God knows exactly where we are.
        </p>

        {/* Scripture */}
        <blockquote className="border-l-2 border-primary/40 pl-4 text-sm italic text-muted-foreground">
          "I will instruct you and teach you in the way you should go;
          I will counsel you with my loving eye on you."
          <span className="mt-1 block text-xs not-italic opacity-70">— Psalm 32:8</span>
        </blockquote>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-2">
          <Button asChild size="lg" className="w-full">
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Return Home
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link to="/board">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Go to Prayer Board
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

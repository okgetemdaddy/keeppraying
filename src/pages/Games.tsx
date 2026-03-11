import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Games() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <div className="text-center space-y-4 max-w-md">
        <span className="text-5xl">🎮</span>
        <h1 className="font-display text-3xl font-bold">Bible Games</h1>
        <p className="text-muted-foreground">Bible trivia, verse flashcards, memory match, and more — coming soon to strengthen your knowledge of the Word.</p>
        <Link to="/"><Button variant="outline" className="rounded-xl gap-2"><ArrowLeft className="w-4 h-4" /> Home</Button></Link>
      </div>
    </div>
  );
}

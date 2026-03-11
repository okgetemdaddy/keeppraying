import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Gamepad2 } from "lucide-react";

export default function Board() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <div className="text-center space-y-4 max-w-md">
        <BookOpen className="w-12 h-12 text-primary mx-auto" />
        <h1 className="font-display text-3xl font-bold">My Prayer Board</h1>
        <p className="text-muted-foreground">Your personal space to organize, pin, and revisit your saved prayers. Save prayers from the collection to build your board.</p>
        <Link to="/prayers"><Button className="btn-gold rounded-xl gap-2">Browse Prayers <ArrowRight className="w-4 h-4" /></Button></Link>
      </div>
    </div>
  );
}

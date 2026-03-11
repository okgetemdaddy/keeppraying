import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Blog() {
  const posts = [
    { title: "The Power of a Consistent Prayer Life", excerpt: "How daily prayer transforms your relationship with God and shapes your character.", date: "March 2026" },
    { title: "Understanding the Lord's Prayer", excerpt: "A verse-by-verse breakdown of the prayer Jesus taught his disciples.", date: "February 2026" },
    { title: "What Is a War Room?", excerpt: "Creating a dedicated prayer space that changes everything.", date: "January 2026" },
  ];
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 text-sm"><ArrowLeft className="w-4 h-4" /> Home</Link>
        <h1 className="font-display text-4xl font-bold mb-2">KeepGrow.ing</h1>
        <p className="text-muted-foreground mb-10">Faith articles to help you grow deeper in prayer and Scripture.</p>
        <div className="space-y-6">
          {posts.map(p => (
            <div key={p.title} className="prayer-card p-6 space-y-2">
              <span className="text-xs text-muted-foreground">{p.date}</span>
              <h2 className="font-display text-xl font-semibold">{p.title}</h2>
              <p className="text-muted-foreground text-sm">{p.excerpt}</p>
              <Button variant="link" className="p-0 h-auto text-primary text-sm">Read more →</Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

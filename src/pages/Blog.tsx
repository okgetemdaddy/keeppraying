import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, ArrowRight, BookOpen, ArrowLeft } from "lucide-react";

interface BlogPost {
  id: string; title: string; slug: string; excerpt: string | null;
  cover_image_url: string | null; created_at: string;
}

export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Faith & Prayer Blog | KeepPray.ing";
    supabase.from("blog_posts").select("id,title,slug,excerpt,cover_image_url,created_at").eq("published", true).order("created_at", { ascending: false })
      .then(({ data }) => { setPosts(data || []); setLoading(false); });
    return () => { document.title = "KeepPray.ing"; };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="font-display font-bold text-xl text-foreground">KeepPray.ing</Link>
          <Link to="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" />Home</Link>
        </div>
      </header>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl font-bold mb-3">Faith & Prayer Blog</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">Reflections, teachings, and encouragement for your prayer journey</p>
          <p className="verse-text text-sm mt-3">"Your word is a lamp to my feet and a light to my path." — Psalm 119:105</p>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-64 rounded-2xl shimmer" />)}</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto opacity-50" />
            <p className="text-muted-foreground font-display italic">No posts yet. Check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {posts.map((post, i) => (
              <motion.article key={post.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="prayer-card overflow-hidden flex flex-col group">
                {post.cover_image_url && <div className="h-40 overflow-hidden"><img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /></div>}
                <div className="p-5 flex flex-col flex-1 space-y-3">
                  <h2 className="font-display text-xl font-bold group-hover:text-primary transition-colors">{post.title}</h2>
                  {post.excerpt && <p className="text-sm text-muted-foreground leading-relaxed flex-1">{post.excerpt}</p>}
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Calendar className="w-3 h-3" />{new Date(post.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    <Link to={`/blog/${post.slug}`} className="flex items-center gap-1 text-sm text-primary hover:underline">Read more <ArrowRight className="w-3 h-3" /></Link>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

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

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Calendar, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface BlogPostFull {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover_image_url: string | null;
  created_at: string;
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPostFull | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .eq("published", true)
      .single()
      .then(({ data }) => {
        setPost(data);
        if (data) document.title = `${data.title} | KeepPray.ing Blog`;
        setLoading(false);
      });
    return () => { document.title = "KeepPray.ing"; };
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (!post) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground font-display italic">Post not found.</p>
      <Link to="/blog"><Button className="btn-gold rounded-xl">Back to Blog</Button></Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/blog" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />Blog
          </Link>
        </div>
      </header>

      {post.cover_image_url && (
        <div className="w-full h-64 md:h-80 overflow-hidden">
          <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="container mx-auto px-4 py-10 max-w-2xl">
        <motion.article initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              {new Date(post.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <h1 className="font-display text-4xl font-bold">{post.title}</h1>
            {post.excerpt && <p className="text-lg text-muted-foreground font-display italic">{post.excerpt}</p>}
          </div>

          {post.content && (
            <div className="prose prose-sm max-w-none text-foreground
              [&_h1]:font-display [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-6
              [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-5
              [&_h3]:font-display [&_h3]:text-lg [&_h3]:font-medium [&_h3]:mt-4
              [&_p]:leading-relaxed [&_p]:mb-4
              [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground
              [&_strong]:text-foreground [&_em]:text-muted-foreground
            ">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
            </div>
          )}

          <div className="pt-8 border-t border-border text-center space-y-3">
            <p className="verse-text text-sm">"Your word is a lamp to my feet and a light to my path." — Psalm 119:105</p>
            <div className="flex gap-3 justify-center">
              <Link to="/blog"><Button variant="outline" className="rounded-xl">More Articles</Button></Link>
              <Link to="/prayers"><Button className="btn-gold rounded-xl">Browse Prayers</Button></Link>
            </div>
          </div>
        </motion.article>
      </div>
    </div>
  );
}

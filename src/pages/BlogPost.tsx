import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Calendar, Loader2, Share2, BookmarkPlus, Check } from "lucide-react";
import { motion } from "framer-motion";
import VerseLink from "@/components/VerseLink";
import { useToast } from "@/hooks/use-toast";

interface BlogPostFull {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover_image_url: string | null;
  created_at: string;
}

/** Sanitise content: replace literal \n with real newlines (safety net for admin editor) */
function sanitiseContent(raw: string): string {
  // Only replace if real newlines are absent — avoids double-replacing already correct content
  if (!raw.includes("\n") && raw.includes("\\n")) {
    return raw.replace(/\\n/g, "\n");
  }
  return raw;
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [post, setPost] = useState<BlogPostFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shared, setShared] = useState(false);

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
        if (data) document.title = `${data.title} | KeepGrow.ing`;
        setLoading(false);
      });
    return () => { document.title = "KeepPray.ing"; };
  }, [slug]);

  const handleShare = async () => {
    const url = window.location.href;
    const title = post?.title ?? "KeepGrow.ing";
    const text = post?.excerpt ?? "A faith & growth article from KeepGrow.ing";
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch { /* user cancelled */ }
    }
    // Fallback: copy link
    await navigator.clipboard.writeText(url);
    setShared(true);
    toast({ title: "Link copied!", description: "Share it with someone who needs encouragement." });
    setTimeout(() => setShared(false), 3000);
  };

  const handleSaveToBoard = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to save articles to your board.", variant: "destructive" });
      return;
    }
    if (!post) return;
    setSaving(true);
    try {
      // Create a prayer card from the blog post excerpt/content so it appears on the board
      const prayerText = post.excerpt ?? post.title;
      const { data: card, error: cardErr } = await supabase
        .from("prayer_cards")
        .insert({
          title: post.title,
          prayer_text: prayerText,
          extended_prayer: post.content ?? undefined,
          source: "community",
          status: "approved",
          labels: ["blog", "keepgrowing"],
        })
        .select("id")
        .single();

      if (cardErr || !card) throw cardErr;

      const { error: saveErr } = await supabase
        .from("user_saved_prayers")
        .insert({
          user_id: user.id,
          prayer_id: card.id,
          card_size: "medium",
          grid_position: 0,
        });

      if (saveErr) throw saveErr;

      setSaved(true);
      toast({ title: "Saved to your board!", description: `"${post.title}" is now on your prayer board.` });
    } catch {
      toast({ title: "Could not save", description: "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (!post) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground font-display italic">Post not found.</p>
      <Link to="/blog"><Button className="btn-gold rounded-xl">Back to KeepGrow.ing</Button></Link>
    </div>
  );

  const content = post.content ? sanitiseContent(post.content) : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/blog" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />KeepGrow.ing
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSaveToBoard}
              disabled={saving || saved}
              className="flex items-center gap-1.5 text-xs rounded-xl"
            >
              {saved ? <Check className="w-3.5 h-3.5 text-primary" /> : saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
              {saved ? "Saved" : "Save to Board"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="flex items-center gap-1.5 text-xs rounded-xl"
            >
              {shared ? <Check className="w-3.5 h-3.5 text-primary" /> : <Share2 className="w-3.5 h-3.5" />}
              Share
            </Button>
          </div>
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

          {content && (
            <div className="prose prose-sm max-w-none text-foreground
              [&_h1]:font-display [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-8 [&_h1]:mb-3
              [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-7 [&_h2]:mb-2 [&_h2]:text-foreground
              [&_h3]:font-display [&_h3]:text-lg [&_h3]:font-medium [&_h3]:mt-5 [&_h3]:mb-1.5 [&_h3]:text-foreground
              [&_p]:leading-relaxed [&_p]:mb-4
              [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_ul]:mb-4
              [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-1 [&_ol]:mb-4
              [&_li]:leading-relaxed
              [&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:py-1 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:my-5
              [&_strong]:text-foreground [&_strong]:font-semibold
              [&_em]:text-primary/80
              [&_hr]:border-border [&_hr]:my-6
            ">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          )}

          <div className="pt-8 border-t border-border space-y-5">
            {/* Share + Save row */}
            <div className="flex flex-wrap gap-3 justify-center">
              <Button
                variant="outline"
                onClick={handleSaveToBoard}
                disabled={saving || saved}
                className="rounded-xl flex items-center gap-2"
              >
                {saved ? <Check className="w-4 h-4 text-primary" /> : saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookmarkPlus className="w-4 h-4" />}
                {saved ? "Saved to Board" : "Save to My Board"}
              </Button>
              <Button
                variant="outline"
                onClick={handleShare}
                className="rounded-xl flex items-center gap-2"
              >
                {shared ? <Check className="w-4 h-4 text-primary" /> : <Share2 className="w-4 h-4" />}
                {shared ? "Link Copied!" : "Share Article"}
              </Button>
            </div>

            <div className="text-center space-y-3">
              <p className="verse-text text-sm">"Your word is a lamp to my feet and a light to my path." — <VerseLink reference="Psalm 119:105" text="Your word is a lamp to my feet and a light to my path." /></p>
              <div className="flex gap-3 justify-center">
                <Link to="/blog"><Button variant="outline" className="rounded-xl">More from KeepGrow.ing</Button></Link>
                <Link to="/prayers"><Button className="btn-gold rounded-xl">Browse Prayers</Button></Link>
              </div>
            </div>
          </div>
        </motion.article>
      </div>
    </div>
  );
}

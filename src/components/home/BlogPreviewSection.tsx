import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen } from "lucide-react";

const featuredPosts = [
  {
    slug: "roblox-account-security-guide",
    title: "Complete Roblox Account Security Guide 2026",
    excerpt: "Protect your Roblox account from hackers with two-factor authentication, password best practices, and phishing prevention.",
    category: "Security",
    readTime: "8 min read",
  },
  {
    slug: "roblox-studio-beginners",
    title: "Roblox Studio for Beginners: Create Your First Game",
    excerpt: "Start your game development journey with this beginner-friendly tutorial covering building, scripting, and publishing.",
    category: "Development",
    readTime: "15 min read",
  },
  {
    slug: "how-to-earn-robux-free",
    title: "Legitimate Ways to Earn Free Robux in 2026",
    excerpt: "Learn honest and safe methods to earn Robux — from game development to Microsoft Rewards — without falling for scams.",
    category: "Guides",
    readTime: "7 min read",
  },
];

export function BlogPreviewSection() {
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-4">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">From Our Blog</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
            Roblox Guides & Resources
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Free, in-depth articles to help you stay safe, learn game development, and get the most out of Roblox.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {featuredPosts.map((post) => (
            <Link key={post.slug} to={`/blog/${post.slug}`}>
              <Card className="p-6 bg-glass hover:border-primary/30 transition-all duration-300 h-full flex flex-col group">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">{post.category}</span>
                    <span className="text-xs text-muted-foreground">{post.readTime}</span>
                  </div>
                  <h3 className="font-heading text-lg font-bold mb-2 group-hover:text-primary transition-colors">{post.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{post.excerpt}</p>
                </div>
                <div className="flex items-center gap-2 pt-4 mt-4 border-t border-border/50 text-sm text-primary font-medium">
                  Read article <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link to="/blog" className="text-primary hover:underline font-medium inline-flex items-center gap-2">
            View all articles <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

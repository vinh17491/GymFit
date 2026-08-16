import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, User, ArrowRight, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

const posts = [
  { id: 1, title: '5 Tips to Start Your Fitness Journey', excerpt: 'Starting a fitness journey can be overwhelming. Here are 5 tips to help you get started.', author: 'GYMFIT Editorial', date: 'Mar 15, 2024', category: 'Tips' },
  { id: 2, title: 'The Science of Muscle Growth', excerpt: 'Understanding how muscles grow can help you optimize your training for better results.', author: 'GYMFIT Editorial', date: 'Mar 12, 2024', category: 'Science' },
  { id: 3, title: 'Nutrition Fundamentals for Athletes', excerpt: 'What you eat matters as much as how you train. Learn the basics of sports nutrition.', author: 'GYMFIT Editorial', date: 'Mar 10, 2024', category: 'Nutrition' },
  { id: 4, title: 'HIIT vs Steady State Cardio', excerpt: 'Which cardio method is better for fat loss? We break down the pros and cons.', author: 'GYMFIT Editorial', date: 'Mar 8, 2024', category: 'Training' },
  { id: 5, title: 'Recovery: The Secret Weapon', excerpt: 'Recovery is where the magic happens. Learn why rest days are essential.', author: 'GYMFIT Editorial', date: 'Mar 5, 2024', category: 'Recovery' },
  { id: 6, title: 'Building a Home Gym on a Budget', excerpt: "You don't need expensive equipment to get in shape. Here's how to build a home gym.", author: 'GYMFIT Editorial', date: 'Mar 3, 2024', category: 'Equipment' }
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-[#020617] py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">Fitness Blog</h1>
          <p className="text-[#94a3b8] text-lg">Tips, guides, and insights from our expert coaches.</p>
        </motion.div>

        <div className="relative mb-8 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" size={20} />
          <input type="text" placeholder="Search articles..."
            className="w-full rounded-lg border border-[#1e293b] bg-[#0f172a] pl-10 pr-4 py-3 text-white placeholder-[#64748b] focus:border-[#2563eb] focus:outline-none transition-all" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post, i) => (
            <motion.article key={post.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-6 transition-all hover:border-[#2563eb]/50 hover:scale-[1.02]">
              <div className="mb-3 inline-flex rounded-full bg-[#2563eb]/10 px-3 py-1 text-xs font-medium text-[#60a5fa]">{post.category}</div>
              <h2 className="mb-3 text-xl font-semibold text-white">{post.title}</h2>
              <p className="mb-4 text-[#94a3b8] text-sm leading-relaxed">{post.excerpt}</p>
              <div className="flex items-center justify-between text-xs text-[#64748b]">
                <div className="flex items-center gap-2"><User size={14} /><span>{post.author}</span></div>
                <div className="flex items-center gap-2"><Calendar size={14} /><span>{post.date}</span></div>
              </div>
              <Link to={`/blog/${post.id}`} className="mt-4 inline-flex items-center gap-1 text-sm text-[#60a5fa] hover:text-[#2563eb] transition-colors">
                Read More <ArrowRight size={14} />
              </Link>
            </motion.article>
          ))}
        </div>
      </div>
    </div>
  );
}

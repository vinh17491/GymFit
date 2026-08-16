import React from 'react';
import { motion } from 'framer-motion';
import { Star, Trophy, TrendingUp, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

const stories = [
  {
    name: 'Sarah Johnson',
    avatar: 'SJ',
    age: 28,
    goal: 'Weight Loss',
    duration: '4 months',
    weightLost: '30 lbs',
    quote: 'Gymer transformed my relationship with fitness. The coaches pushed me when I wanted to quit, and the community kept me accountable. I\'m stronger and happier than ever.',
    rating: 5,
    coach: 'GYMFIT Coaching Team',
  },
  {
    name: 'Mike Thompson',
    avatar: 'MT',
    age: 35,
    goal: 'Muscle Gain',
    duration: '6 months',
    weightLost: '+18 lbs muscle',
    quote: 'The personalized workout plans were exactly what I needed. I went from struggling with basic lifts to deadlifting 315 lbs. The progress tracking kept me motivated.',
    rating: 5,
    coach: 'GYMFIT Coaching Team',
  },
  {
    name: 'Emma Rodriguez',
    avatar: 'ER',
    age: 42,
    goal: 'Endurance',
    duration: '8 months',
    weightLost: 'Completed Marathon',
    quote: 'I never thought I\'d run a marathon at 42. The structured training plans and video library helped me build endurance gradually. Now I\'m training for my second!',
    rating: 5,
    coach: 'GYMFIT Coaching Team',
  },
  {
    name: 'David Park',
    avatar: 'DP',
    age: 24,
    goal: 'Athletic Performance',
    duration: '5 months',
    weightLost: '-15% body fat',
    quote: 'As a competitive athlete, I needed specialized training. Gymer connected me with a coach who understood my sport-specific needs. My performance improved dramatically.',
    rating: 5,
    coach: 'GYMFIT Coaching Team',
  },
  {
    name: 'Lisa Chen',
    avatar: 'LC',
    age: 31,
    goal: 'General Fitness',
    duration: '3 months',
    weightLost: '22 lbs',
    quote: 'The flexibility to train at home or at the gym with video guides was perfect for my busy schedule. The nutrition plans were a game-changer too.',
    rating: 5,
    coach: 'GYMFIT Coaching Team',
  },
  {
    name: 'James Wilson',
    avatar: 'JW',
    age: 50,
    goal: 'Health Recovery',
    duration: '10 months',
    weightLost: 'Lost 45 lbs',
    quote: 'After my doctor told me to get in shape, I was overwhelmed. Gymer made it simple with step-by-step guidance. My blood pressure is normal for the first time in years.',
    rating: 5,
    coach: 'GYMFIT Coaching Team',
  },
];

const stats = [
  { value: '10,000+', label: 'Success Stories', icon: Trophy },
  { value: '95%', label: 'Member Satisfaction', icon: Heart },
  { value: '4.9/5', label: 'Average Rating', icon: Star },
  { value: '85%', label: 'Goal Achievement Rate', icon: TrendingUp },
];

export default function SuccessStoriesPage() {
  return (
    <div className="min-h-screen bg-[#020617] py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-16 text-center">
          <h1 className="text-5xl font-bold text-white mb-4">Success Stories</h1>
          <p className="text-[#94a3b8] text-lg max-w-2xl mx-auto">
            Real transformations from real people. See how Gymer has helped thousands achieve their fitness goals.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="text-center p-6 rounded-xl border border-[#1e293b] bg-[#0f172a]">
                <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#2563eb]/10">
                  <Icon size={24} className="text-[#60a5fa]" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-[#64748b]">{stat.label}</div>
              </div>
            );
          })}
        </motion.div>

        {/* Stories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {stories.map((story, i) => (
            <motion.div
              key={story.name}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.02, y: -5 }}
              className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-8 transition-all hover:border-[#2563eb]/50"
            >
              <div className="flex items-center mb-4">
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-[#2563eb] to-[#0ea5e9] flex items-center justify-center text-white font-bold text-lg">
                  {story.avatar}
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-white">{story.name}</h3>
                  <p className="text-sm text-[#64748b]">Age {story.age}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-4 text-sm">
                <span className="inline-flex items-center rounded-full bg-[#22c55e]/20 px-3 py-1 font-medium text-[#22c55e]">
                  {story.goal}
                </span>
                <span className="text-[#64748b]">{story.duration}</span>
              </div>

              <div className="text-2xl font-bold text-white mb-3">{story.weightLost}</div>

              <p className="text-[#94a3b8] text-sm leading-relaxed mb-4 italic">"{story.quote}"</p>

              <div className="flex items-center justify-between pt-4 border-t border-[#1e293b]">
                <span className="text-sm text-[#64748b]">Coach: {story.coach}</span>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: story.rating }).map((_, j) => (
                    <Star key={j} size={14} className="text-[#fbbf24] fill-[#fbbf24]" />
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="text-center">
          <div className="rounded-2xl border border-[#2563eb]/30 bg-gradient-to-r from-[#2563eb]/10 to-[#0ea5e9]/10 p-12">
            <h2 className="mb-4 text-3xl font-bold text-white">Ready to Write Your Success Story?</h2>
            <p className="mx-auto mb-8 max-w-xl text-[#94a3b8]">
              Join thousands of members who have transformed their lives with Gymer. Your story could be next.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-[#2563eb] px-8 py-4 text-lg font-semibold text-white transition-all hover:bg-[#1d4ed8] hover:scale-105"
            >
              Start Your Transformation
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

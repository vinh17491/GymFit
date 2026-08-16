import { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Dumbbell, Users, Video, Calendar, Shield, Play, ArrowRight, Loader2,
  Zap, Heart, Trophy, Target, ChevronRight, ChevronDown, Quote,
  CheckCircle, Flame, TrendingUp, Award, Clock, MapPin, Wifi,
  Instagram, Twitter, Youtube, Facebook
} from 'lucide-react';
import VideoPreview from './VideoPreview';
import { listPublicCoaches, type Coach } from '../../services/coaches';

/* ──────────── Animated Counter ──────────── */
function AnimatedCounter({ end, suffix = '', prefix = '' }: { end: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(end);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: false, margin: '0px' });
  const animatedRef = useRef(false);

  useEffect(() => {
    if (isInView && !animatedRef.current) {
      animatedRef.current = true;
      setCount(0);
      const duration = 2000;
      const steps = 60;
      const increment = end / steps;
      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if (current >= end) {
          setCount(end);
          clearInterval(timer);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [isInView, end]);

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

/* ──────────── Section Reveal ──────────── */
function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ──────────── HERO ──────────── */
function Hero() {
  const { scrollYProgress } = useScroll();
  const bgY = useTransform(scrollYProgress, [0, 0.3], ['0%', '30%']);
  const opacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);

  return (
    <section className="relative z-20 min-h-[100dvh] flex items-center justify-center overflow-hidden pt-16 md:pt-20">
      {/* Background Image + Overlay */}
      <motion.div style={{ y: bgY }} className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=80"
          alt="Gym background"
          className="w-full h-full object-cover scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/80 via-[#020617]/60 to-[#020617]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#020617]/50 to-transparent" />
      </motion.div>

      {/* Animated Gradient Orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#22C55E]/10 rounded-full blur-[128px] animate-pulse" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#22C55E]/5 rounded-full blur-[128px] animate-pulse" style={{ animationDelay: '1s' }} />

      <motion.div style={{ opacity }} className="relative z-30 premium-container text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-6"
        >
          <span className="premium-badge inline-flex items-center gap-2">
            <Zap size={14} /> The #1 Fitness Platform
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="hero-title mb-6"
        >
          Transform Your Body.<br />
          <span className="text-gradient">Train Smarter.</span><br />
          <span className="text-[#FB923C]">Live Better.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="hero-subtitle mb-10 max-w-3xl mx-auto"
        >
          The premium fitness platform trusted by athletes, professionals, and achievers
          who refuse mediocrity.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link to="/register" className="hero-btn-primary flex items-center gap-2">
            <Dumbbell size={20} /> Start Training
          </Link>
          <Link to="/coaches" className="hero-btn-secondary flex items-center gap-2">
            <Users size={20} /> Explore Coaches
          </Link>
          <Link to="/videos" className="hero-btn-secondary flex items-center gap-2">
            <Play size={20} /> Watch Videos
          </Link>
          <Link to="/membership" className="text-[#94A3B8] px-6 py-4 font-medium hover:text-white transition-colors flex items-center gap-2">
            View Memberships <ArrowRight size={18} />
          </Link>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <ChevronDown size={28} className="text-[#94A3B8]" />
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ──────────── SOCIAL PROOF ──────────── */
function SocialProof() {
  const stats = [
    { icon: Users, value: 10000, suffix: '+', label: 'Members', color: '#22C55E' },
    { icon: Video, value: 500, suffix: '+', label: 'Workout Videos', color: '#FB923C' },
    { icon: Award, value: 50, suffix: '+', label: 'Certified Coaches', color: '#3B82F6' },
    { icon: Trophy, value: 100000, suffix: '+', label: 'Completed Workouts', color: '#A855F7' },
  ];

  return (
    <section className="relative py-16 mt-0 z-10">
      <div className="premium-container">
        <Reveal>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  className="premium-card-compact text-center group"
                >
                  <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                    style={{ background: `${stat.color}20` }}>
                    <Icon size={28} style={{ color: stat.color }} />
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-white mb-1">
                    <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-sm text-[#94A3B8] font-medium">{stat.label}</div>
                </motion.div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ──────────── FEATURES ──────────── */
function Features() {
  const features = [
    { icon: Dumbbell, title: 'Personalized Workouts', description: 'AI-powered workout plans tailored to your goals, experience, and equipment.', gradient: 'from-[#22C55E] to-[#16A34A]' },
    { icon: Users, title: 'Expert Coaches', description: 'Connect with certified fitness professionals who care about your progress.', gradient: 'from-[#FB923C] to-[#FBBF24]' },
    { icon: Video, title: 'Video Library', description: 'Hundreds of HD training videos available 24/7. Learn from the best.', gradient: 'from-[#3B82F6] to-[#06B6D4]' },
    { icon: Calendar, title: 'Session Booking', description: 'Easy scheduling with real-time availability. Book in seconds.', gradient: 'from-[#A855F7] to-[#EC4899]' },
    { icon: Heart, title: 'Health Tracking', description: 'Monitor your progress with detailed analytics and insights.', gradient: 'from-[#EF4444] to-[#F97316]' },
    { icon: Shield, title: 'Premium Content', description: 'Exclusive content from industry leaders. Never stop learning.', gradient: 'from-[#14B8A6] to-[#22C55E]' },
  ];

  return (
    <section className="section-padding relative">
      <div className="absolute inset-0 bg-gradient-to-b from-[#020617] via-[#0a1628] to-[#020617]" />
      <div className="premium-container relative z-10">
        <Reveal className="text-center mb-16">
          <span className="premium-badge mb-4 inline-flex">Why Choose Gymer</span>
          <h2 className="heading-2 mb-4">Everything You Need to<br /><span className="text-gradient">Transform Your Life</span></h2>
          <p className="text-[#94A3B8] max-w-2xl mx-auto text-lg">
            The complete fitness platform designed for people who take their health seriously.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                whileHover={{ y: -8 }}
                className="premium-card group cursor-pointer"
              >
                <div className={`w-16 h-16 rounded-2xl mb-6 flex items-center justify-center bg-gradient-to-br ${feature.gradient} shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                  <Icon size={28} className="text-white" />
                </div>
                <h3 className="heading-3 mb-3">{feature.title}</h3>
                <p className="text-[#94A3B8] leading-relaxed">{feature.description}</p>
                <div className="mt-4 flex items-center gap-2 text-[#22C55E] font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  Learn more <ArrowRight size={16} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ──────────── COACHES ──────────── */
function CoachMarketplace() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    listPublicCoaches({ page: 1, limit: 4 })
      .then(value => setCoaches(value.coaches))
      .catch(() => setError('Coach list could not be loaded.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="section-padding relative">
      <div className="absolute inset-0 bg-gradient-to-b from-[#020617] via-[#0f172a] to-[#020617]" />
      <div className="premium-container relative z-10">
        <Reveal className="text-center mb-16">
          <span className="premium-badge mb-4 inline-flex"><Users size={14} /> Expert Coaches</span>
          <h2 className="heading-2 mb-4">Train with <span className="text-gradient">World-Class</span> Coaches</h2>
          <p className="text-[#94A3B8] max-w-2xl mx-auto text-lg">Coach profiles and booking availability come from the active database.</p>
        </Reveal>
        {loading && <div className="flex items-center justify-center gap-2 py-16 text-[#94A3B8]"><Loader2 size={22} className="animate-spin" />Loading coaches...</div>}
        {!loading && error && <div className="py-12 text-center text-[#94A3B8]">{error}</div>}
        {!loading && !error && coaches.length === 0 && <div className="py-12 text-center text-[#94A3B8]">No active coaches are available.</div>}
        {!loading && !error && coaches.length > 0 && <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {coaches.map((coach, i) => <motion.div key={coach.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.1 }} whileHover={{ y: -10 }} className="group">
            <Link to={'/coaches/' + coach.id}>
              <div className="relative mb-4 aspect-[3/4] overflow-hidden rounded-2xl">
                {coach.avatarUrl ? <img src={coach.avatarUrl} alt={coach.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" /> : <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#2563eb] to-[#0ea5e9] text-5xl font-bold text-white">{coach.name.split(/\s+/).map(part => part[0] ?? '').join('').slice(0, 2)}</div>}
                <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent" />
              </div>
              <h3 className="font-semibold text-white group-hover:text-[#22C55E] transition-colors">{coach.name}</h3>
              <p className="mb-2 text-sm text-[#22C55E]">{coach.specialty || 'Fitness Coach'}</p>
              <div className="text-sm text-[#94A3B8]">{coach.location || 'GYMFIT Coach'}{coach.experienceYears !== null && <span> · {coach.experienceYears} years experience</span>}</div>
            </Link>
          </motion.div>)}
        </div>}
        <Reveal className="text-center mt-12"><Link to="/coaches" className="hero-btn-secondary inline-flex items-center gap-2">View All Coaches <ArrowRight size={18} /></Link></Reveal>
      </div>
    </section>
  );
}


/* ──────────── TRANSFORMATIONS ──────────── */
function TransformationStories() {
  const stories = [
    { name: 'Sarah J.', before: '25% body fat', after: '18% body fat', duration: '3 months', image: 'https://images.unsplash.com/photo-1571019614242-c5c5de18c084?w=400&q=80' },
    { name: 'Mike T.', before: 'Couldn\'t run 1km', after: 'Completed marathon', duration: '6 months', image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80' },
    { name: 'Emma R.', before: '60kg', after: '70kg muscle', duration: '4 months', image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&q=80' },
  ];

  return (
    <section className="section-padding relative overflow-hidden">
      <div className="absolute inset-0 bg-[#060b16]" />
      <div className="premium-container relative z-10">
        <Reveal className="text-center mb-16">
          <span className="premium-badge mb-4 inline-flex"><TrendingUp size={14} /> Transformations</span>
          <h2 className="heading-2 mb-4">Real People. <span className="text-gradient">Real Results.</span></h2>
          <p className="text-[#94A3B8] max-w-2xl mx-auto text-lg">
            See how our members have transformed their lives with Gymer.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {stories.map((story, i) => (
            <motion.div
              key={story.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="premium-card group"
            >
              <div className="relative rounded-xl overflow-hidden mb-6 aspect-video">
                <img src={story.image} alt={story.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111827] to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="premium-badge text-[10px] inline-flex">{story.duration}</div>
                </div>
              </div>
              <h3 className="font-semibold text-white mb-3">{story.name}'s Journey</h3>
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-[#94A3B8]">Before:</span>
                  <span className="text-red-400 ml-2 font-medium">{story.before}</span>
                </div>
                <ArrowRight size={16} className="text-[#22C55E]" />
                <div>
                  <span className="text-[#94A3B8]">After:</span>
                  <span className="text-[#22C55E] ml-2 font-medium">{story.after}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────── MEMBERSHIP PREVIEW ──────────── */
function MembershipPreview() {
  const plans = [
    { name: 'Basic', price: '29', period: 'month', features: ['Access to video library', 'Basic workout plans', 'Community access', 'Mobile app'], popular: false },
    { name: 'Pro', price: '59', period: 'month', features: ['Everything in Basic', '1-on-1 coach sessions', 'Custom meal plans', 'Priority support', 'Advanced analytics'], popular: true },
    { name: 'Elite', price: '99', period: 'month', features: ['Everything in Pro', 'Unlimited coaching', 'Exclusive content', 'VIP events', 'Personal training'], popular: false },
  ];

  return (
    <section className="section-padding relative">
      <div className="absolute inset-0 bg-gradient-to-b from-[#020617] via-[#0a1628] to-[#020617]" />
      <div className="premium-container relative z-10">
        <Reveal className="text-center mb-16">
          <span className="premium-badge mb-4 inline-flex"><Flame size={14} /> Membership</span>
          <h2 className="heading-2 mb-4">Choose Your <span className="text-gradient">Path</span></h2>
          <p className="text-[#94A3B8] max-w-2xl mx-auto text-lg">
            Invest in yourself. Every plan includes our core features.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              whileHover={{ y: -8 }}
              className={`relative rounded-2xl p-8 ${plan.popular ? 'bg-gradient-to-b from-[#22C55E]/20 to-[#111827] border-2 border-[#22C55E]/50' : 'premium-card'}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-[#22C55E] text-white px-4 py-1 rounded-full text-sm font-semibold">Most Popular</span>
                </div>
              )}
              <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-white">${plan.price}</span>
                <span className="text-[#94A3B8]">/{plan.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm text-[#94A3B8]">
                    <CheckCircle size={16} className="text-[#22C55E] flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/register" className={`block text-center py-3 rounded-xl font-semibold transition-all ${plan.popular ? 'hero-btn-primary' : 'hero-btn-secondary'}`}>
                Get Started
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────── TESTIMONIALS ──────────── */
function Testimonials() {
  const testimonials = [
    { name: 'Sarah J.', role: 'Lost 20 lbs in 3 months', avatar: 'SJ', text: 'Gymer completely changed my life. The coaches are incredible and the community keeps me motivated every single day.' },
    { name: 'Mike T.', role: 'Completed half marathon', avatar: 'MT', text: 'I went from couch to marathon in 6 months. The personalized training plans made all the difference.' },
    { name: 'Emma R.', role: 'Gained 15 lbs of muscle', avatar: 'ER', text: 'The video library is amazing. I learned proper form and technique from world-class coaches.' },
  ];

  return (
    <section className="section-padding relative">
      <div className="absolute inset-0 bg-[#060b16]" />
      <div className="premium-container relative z-10">
        <Reveal className="text-center mb-16">
          <span className="premium-badge mb-4 inline-flex"><Quote size={14} /> Testimonials</span>
          <h2 className="heading-2 mb-4">What Our <span className="text-gradient">Members</span> Say</h2>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="premium-card"
            >
              <Quote size={32} className="text-[#22C55E]/30 mb-4" />
              <p className="text-[#94A3B8] mb-6 leading-relaxed">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#22C55E] to-[#16A34A] flex items-center justify-center text-white font-bold">
                  {t.avatar}
                </div>
                <div>
                  <h4 className="font-semibold text-white">{t.name}</h4>
                  <p className="text-sm text-[#22C55E]">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────── FAQ ──────────── */
function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const faqs = [
    { q: 'How does the free trial work?', a: 'Start with a 7-day free trial. No credit card required. Access all features and decide if Gymer is right for you.' },
    { q: 'Can I cancel anytime?', a: 'Yes! Cancel anytime from your account settings. No questions asked, no hidden fees.' },
    { q: 'Are the coaches certified?', a: 'All our coaches hold nationally recognized certifications (NASM, ACE, ACSM) and have 5+ years of experience.' },
    { q: 'Is there a mobile app?', a: 'Yes! Gymer is available on iOS and Android. Download it from the App Store or Google Play.' },
    { q: 'What payment methods do you accept?', a: 'We accept all major credit cards, debit cards, and bank transfers via VietQR.' },
  ];

  return (
    <section className="section-padding relative">
      <div className="premium-container relative z-10">
        <Reveal className="text-center mb-16">
          <span className="premium-badge mb-4 inline-flex"><Target size={14} /> FAQ</span>
          <h2 className="heading-2 mb-4">Frequently Asked <span className="text-gradient">Questions</span></h2>
        </Reveal>

        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="rounded-2xl border border-[#1e293b] bg-[#0f172a] overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <span className="font-semibold text-white">{faq.q}</span>
                <ChevronDown
                  size={20}
                  className={`text-[#22C55E] transition-transform duration-300 ${openIndex === i ? 'rotate-180' : ''}`}
                />
              </button>
              <motion.div
                initial={false}
                animate={{ height: openIndex === i ? 'auto' : 0, opacity: openIndex === i ? 1 : 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <p className="px-6 pb-6 text-[#94A3B8] leading-relaxed">{faq.a}</p>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────── CTA ──────────── */
function CTA() {
  return (
    <section className="section-padding relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-[#22C55E]/20 to-[#16A34A]/20" />
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#22C55E]/10 rounded-full blur-[128px]" />
      </div>
      <div className="premium-container relative z-10 text-center">
        <Reveal>
          <span className="premium-badge mb-4 inline-flex"><Zap size={14} /> Get Started Today</span>
          <h2 className="heading-2 mb-6">
            Ready to <span className="text-gradient">Transform</span>?
          </h2>
          <p className="text-[#94A3B8] text-lg max-w-2xl mx-auto mb-10">
            Join 10,000+ members who have already transformed their lives. Start your 7-day free trial today.
          </p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/register" className="hero-btn-primary flex items-center gap-2">
              <Dumbbell size={20} /> Start Free Trial
            </Link>
            <Link to="/membership" className="hero-btn-secondary flex items-center gap-2">
              View Plans <ArrowRight size={18} />
            </Link>
          </motion.div>
        </Reveal>
      </div>
    </section>
  );
}

/* ──────────── FOOTER ──────────── */
function Footer() {
  return (
    <footer className="relative border-t border-[#1e293b] bg-[#020617]">
      <div className="premium-container py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#22C55E] to-[#16A34A] flex items-center justify-center shadow-lg">
                <Dumbbell size={20} className="text-white" />
              </div>
              <span className="text-xl font-bold text-white">Gymer</span>
            </Link>
            <p className="text-[#94A3B8] mb-6 max-w-sm leading-relaxed">
              The premium fitness platform helping thousands achieve their fitness goals through expert coaching and personalized training.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-lg bg-[#1e293b] flex items-center justify-center hover:bg-[#334155] transition-colors">
                <Instagram size={18} className="text-[#94A3B8] hover:text-white" />
              </a>
              <a href="#" className="w-10 h-10 rounded-lg bg-[#1e293b] flex items-center justify-center hover:bg-[#334155] transition-colors">
                <Twitter size={18} className="text-[#94A3B8] hover:text-white" />
              </a>
              <a href="#" className="w-10 h-10 rounded-lg bg-[#1e293b] flex items-center justify-center hover:bg-[#334155] transition-colors">
                <Youtube size={18} className="text-[#94A3B8] hover:text-white" />
              </a>
              <a href="#" className="w-10 h-10 rounded-lg bg-[#1e293b] flex items-center justify-center hover:bg-[#334155] transition-colors">
                <Facebook size={18} className="text-[#94A3B8] hover:text-white" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-white mb-6">Quick Links</h4>
            <ul className="space-y-3">
              <li><Link to="/" className="text-sm text-[#94A3B8] hover:text-white transition-colors">Home</Link></li>
              <li><Link to="/videos" className="text-sm text-[#94A3B8] hover:text-white transition-colors">Videos</Link></li>
              <li><Link to="/coaches" className="text-sm text-[#94A3B8] hover:text-white transition-colors">Coaches</Link></li>
              <li><Link to="/membership" className="text-sm text-[#94A3B8] hover:text-white transition-colors">Membership</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-white mb-6">Support</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-sm text-[#94A3B8] hover:text-white transition-colors">Help Center</a></li>
              <li><a href="#" className="text-sm text-[#94A3B8] hover:text-white transition-colors">Contact Us</a></li>
              <li><a href="#" className="text-sm text-[#94A3B8] hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-sm text-[#94A3B8] hover:text-white transition-colors">Terms of Service</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-white mb-6">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm text-[#94A3B8]">
                <MapPin size={14} className="text-[#22C55E]" /> Ho Chi Minh City
              </li>
              <li className="flex items-center gap-2 text-sm text-[#94A3B8]">
                <Wifi size={14} className="text-[#22C55E]" /> hello@gymer.com
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#1e293b] mt-12 pt-8 text-center text-sm text-[#64748b]">
          &copy; {new Date().getFullYear()} Gymer. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

/* ──────────── MAIN LANDING PAGE ──────────── */
export default function LandingPage() {
  return (
    <div className="bg-[#020617] text-white min-h-screen">
      <Hero />
      <SocialProof />
      <Features />
      <VideoPreview />
      <CoachMarketplace />
      <TransformationStories />
      <MembershipPreview />
      <Testimonials />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
}

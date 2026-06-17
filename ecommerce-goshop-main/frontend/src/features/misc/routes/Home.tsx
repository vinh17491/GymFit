import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  FaDumbbell, FaApple, FaUsers,
  FaArrowRight, FaCheck, FaStar, FaQuoteLeft,
  FaFire, FaBrain, FaChartLine, FaWater,
  FaFacebook, FaInstagram, FaTwitter, FaTiktok,
  FaChevronLeft, FaChevronRight
} from "react-icons/fa6";
/* ===== DATA ===== */
const stats = [
  { value: "5+", label: "Years Experience" },
  { value: "50+", label: "Expert Coaches" },
  { value: "500+", label: "Active Members" },
  { value: "98%", label: "Satisfaction Rate" },
];

const services = [
  { icon: FaDumbbell, title: "Equipment Zone", desc: "Full range of cardio & resistance machines", color: "from-cyan-500/20 to-transparent" },
  { icon: FaFire, title: "Free Weights", desc: "Dumbbells, barbells, racks up to 500kg", color: "from-orange-500/20 to-transparent" },
  { icon: FaWater, title: "Sauna & Spa", desc: "Recovery zone with dry & wet sauna", color: "from-blue-500/20 to-transparent" },
  { icon: FaApple, title: "Nutrition Bar", desc: "Pre/post workout meals & protein shakes", color: "from-green-500/20 to-transparent" },
  { icon: FaUsers, title: "Group Classes", desc: "HIIT, Zumba, Spinning, CrossFit", color: "from-purple-500/20 to-transparent" },
  { icon: FaBrain, title: "Yoga Studio", desc: "Hot yoga, pilates, mindfulness sessions", color: "from-pink-500/20 to-transparent" },
];

const coaches = [
  { name: "Alex Tran", specialty: "Strength & Conditioning", quote: "Strength doesn't come from the body. It comes from the will.", image: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&q=80" },
  { name: "Minh Nguyen", specialty: "Nutrition & Weight Loss", quote: "Food is fuel. Let me teach you how to burn it right.", image: "https://images.unsplash.com/photo-1594381898411-846e7d193883?w=400&q=80" },
  { name: "Linh Pham", specialty: "Yoga & Flexibility", quote: "Flexibility is the superpower of the modern age.", image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&q=80" },
  { name: "Duc Hoang", specialty: "HIIT & Functional Training", quote: "Train insane or remain the same.", image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80" },
];

const plans = [
  {
    name: "Basic", price: "299,000", period: "/month",
    features: ["Gym access (6AM–10PM)", "Locker & shower", "1 fitness assessment", "Mobile app access"],
    cta: "Start Free Trial", popular: false,
  },
  {
    name: "Pro", price: "599,000", period: "/month",
    features: ["24/7 gym access", "All group classes", "2 PT sessions/month", "AI workout generator", "Nutrition plan"],
    cta: "Start Free Trial", popular: true,
  },
  {
    name: "Elite", price: "999,000", period: "/month",
    features: ["Everything in Pro", "Unlimited PT sessions", "1-on-1 coach chat", "Meal prep guide", "Priority support", "Sauna & spa"],
    cta: "Start Free Trial", popular: false,
  },
];

const testimonials = [
  { name: "Tuan Anh", role: "Member since 2024", text: "IRONPHYSIQUE changed my life. Lost 15kg in 3 months with the AI meal plan.", rating: 5, img: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=200&q=80" },
  { name: "Mai Huong", role: "Member since 2023", text: "The coaches are incredible. I've never felt stronger or more confident.", rating: 5, img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80" },
  { name: "Quoc Bui", role: "Premium member", text: "Having a personal coach available 24/7 via chat is a game-changer.", rating: 5, img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80" },
];

/* ===== ANIMATION VARIANTS ===== */
const fadeUp = {
  hidden: { opacity: 0, y: 60 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.6, delay: i * 0.12, ease: "easeOut" as const }
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

/* ===== SECTION COMPONENTS ===== */

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-dark/95 backdrop-blur-md shadow-lg" : "bg-transparent"
      }`}
    >
      <div className="container max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-20">
          <Link to="/" className="flex items-center gap-2">
            <FaDumbbell className="text-cyan text-2xl sm:text-3xl" />
            <span className="font-display text-xl sm:text-2xl tracking-widest text-white">IRONPHYSIQUE</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-8">
            {["Home", "About", "Services", "Pricing", "Coaches"].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="text-gray-400 hover:text-cyan transition text-sm tracking-wider uppercase font-medium">{item}</a>
            ))}
            <Link to="/contact" className="text-gray-400 hover:text-cyan transition text-sm tracking-wider uppercase font-medium">Contact</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/register" className="hidden sm:inline-flex items-center gap-2 bg-cyan text-dark font-bold px-5 py-2.5 rounded-lg text-sm tracking-wider hover:shadow-neon transition-all duration-300 animate-pulse-glow">
              Try Free <FaArrowRight className="text-xs" />
            </Link>
            <button className="lg:hidden text-white text-2xl" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>
      </div>
      {/* Mobile menu */}
      {menuOpen && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="lg:hidden bg-dark-card border-t border-dark-surface">
          <div className="container px-4 py-6 flex flex-col gap-4">
            {["Home", "About", "Services", "Pricing", "Coaches", "Contact"].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setMenuOpen(false)} className="text-gray-300 hover:text-cyan transition text-base uppercase tracking-wider">{item}</a>
            ))}
            <Link to="/register" onClick={() => setMenuOpen(false)} className="bg-cyan text-dark font-bold text-center py-3 rounded-lg mt-2">Try Free</Link>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
};

const Hero = () => {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 600], [0, 200]);
  const opacity = useTransform(scrollY, [0, 400], [1, 0]);

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background overlay with gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-dark via-dark-card to-dark z-0" />
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: "radial-gradient(circle at 25% 50%, rgba(0,255,209,0.15) 0%, transparent 50%), radial-gradient(circle at 75% 50%, rgba(0,255,209,0.1) 0%, transparent 50%)",
      }} />
      {/* Animated grid lines */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: "linear-gradient(rgba(0,255,209,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,209,0.1) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }} />

      <motion.div style={{ y, opacity }} className="relative z-10 container max-w-6xl mx-auto px-4 text-center pt-24">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}>
          <span className="inline-block border border-cyan/30 text-cyan text-xs tracking-[0.3em] uppercase px-4 py-2 rounded-full mb-6 bg-cyan/5">
            Premium Home Training Platform
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="font-display text-6xl sm:text-8xl md:text-9xl leading-none tracking-wider text-white mb-6"
        >
          FORGE YOUR
          <br />
          <span className="text-cyan">IRON WILL</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          AI-powered workouts, personalized nutrition, expert coaches — all from home.
          Transform your body without stepping into a crowded gym.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <Link to="/register" className="group inline-flex items-center gap-3 bg-cyan text-dark font-bold px-8 py-4 rounded-lg text-lg tracking-wider hover:shadow-neon transition-all duration-300">
            Start 14-Day Trial <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link to="/membership" className="inline-flex items-center gap-2 border border-gray-600 text-gray-300 hover:border-cyan hover:text-cyan px-8 py-4 rounded-lg text-lg font-medium transition-all duration-300">
            View Pricing
          </Link>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 max-w-3xl mx-auto"
        >
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-display text-3xl sm:text-4xl text-cyan">{stat.value}</div>
              <div className="text-gray-500 text-xs sm:text-sm uppercase tracking-wider mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-gray-600 text-xs uppercase tracking-widest">Scroll</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-0.5 h-8 bg-gradient-to-b from-cyan to-transparent"
        />
      </motion.div>
    </section>
  );
};

const About = () => {
  return (
    <section id="about" className="py-24 px-4 bg-dark">
      <div className="container max-w-6xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="text-center mb-16"
        >
          <motion.span variants={fadeUp} className="text-cyan text-sm tracking-[0.3em] uppercase">About Us</motion.span>
          <motion.h2 variants={fadeUp} className="font-display text-4xl sm:text-5xl md:text-6xl text-white mt-4 tracking-wider">
            MORE THAN A <span className="text-cyan">GYM</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-gray-400 text-lg max-w-3xl mx-auto mt-6 leading-relaxed">
            IRONPHYSIQUE was born from a simple belief: <strong className="text-white">everyone deserves world-class training</strong>.
            We combine AI technology with human expertise to bring you personalized fitness that adapts to your life — not the other way around.
          </motion.p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: FaBrain, title: "AI-Powered", desc: "Smart algorithms create workouts & meals tailored to your body" },
            { icon: FaUsers, title: "Expert Coaches", desc: "Real human coaches monitor, adjust & motivate you daily" },
            { icon: FaChartLine, title: "Proven Results", desc: "98% of members see measurable improvement in 30 days" },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="bg-dark-card border border-dark-surface rounded-2xl p-8 hover:border-cyan/30 transition-all duration-300 group"
            >
              <item.icon className="text-4xl text-cyan mb-5 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
              <p className="text-gray-400 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Services = () => {
  return (
    <section id="services" className="py-24 px-4 bg-dark-card">
      <div className="container max-w-6xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="text-center mb-16"
        >
          <motion.span variants={fadeUp} className="text-cyan text-sm tracking-[0.3em] uppercase">Facilities</motion.span>
          <motion.h2 variants={fadeUp} className="font-display text-4xl sm:text-5xl md:text-6xl text-white mt-4 tracking-wider">
            WORLD-CLASS <span className="text-cyan">AMENITIES</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-gray-400 text-lg max-w-2xl mx-auto mt-6">
            Everything you need to train, recover, and thrive — under one roof.
          </motion.p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, i) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              whileHover={{ y: -5 }}
              className="relative bg-dark border border-dark-surface rounded-2xl overflow-hidden group cursor-pointer"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <div className="relative p-8">
                <service.icon className="text-3xl text-cyan mb-5" />
                <h3 className="text-xl font-bold text-white mb-2">{service.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{service.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Coaches = () => {
  const [idx, setIdx] = useState(0);
  const prev = () => setIdx((i) => (i === 0 ? coaches.length - 1 : i - 1));
  const next = () => setIdx((i) => (i === coaches.length - 1 ? 0 : i + 1));

  return (
    <section id="coaches" className="py-24 px-4 bg-dark">
      <div className="container max-w-6xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="text-center mb-16"
        >
          <motion.span variants={fadeUp} className="text-cyan text-sm tracking-[0.3em] uppercase">Team</motion.span>
          <motion.h2 variants={fadeUp} className="font-display text-4xl sm:text-5xl md:text-6xl text-white mt-4 tracking-wider">
            MEET YOUR <span className="text-cyan">COACHES</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-gray-400 text-lg max-w-2xl mx-auto mt-6">
            Elite trainers dedicated to your transformation journey.
          </motion.p>
        </motion.div>

        {/* Desktop grid */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-6">
          {coaches.map((coach, i) => (
            <motion.div
              key={coach.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-dark-card border border-dark-surface rounded-2xl overflow-hidden group hover:border-cyan/30 transition-all duration-300"
            >
              <div className="aspect-[3/4] overflow-hidden">
                <img src={coach.image} alt={coach.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold text-white">{coach.name}</h3>
                <p className="text-cyan text-sm font-medium mt-1">{coach.specialty}</p>
                <p className="text-gray-500 text-sm mt-3 italic leading-relaxed">"{coach.quote}"</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Mobile carousel */}
        <div className="md:hidden">
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="bg-dark-card border border-dark-surface rounded-2xl overflow-hidden"
          >
            <div className="aspect-[4/3] overflow-hidden">
              <img src={coaches[idx].image} alt={coaches[idx].name} className="w-full h-full object-cover" loading="lazy" />
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold text-white">{coaches[idx].name}</h3>
              <p className="text-cyan font-medium mt-1">{coaches[idx].specialty}</p>
              <p className="text-gray-500 mt-3 italic">"{coaches[idx].quote}"</p>
            </div>
          </motion.div>
          <div className="flex justify-center gap-4 mt-6">
            <button onClick={prev} className="bg-dark-surface text-white p-3 rounded-full hover:bg-cyan hover:text-dark transition"><FaChevronLeft /></button>
            <button onClick={next} className="bg-dark-surface text-white p-3 rounded-full hover:bg-cyan hover:text-dark transition"><FaChevronRight /></button>
          </div>
        </div>
      </div>
    </section>
  );
};

const Pricing = () => {
  return (
    <section id="pricing" className="py-24 px-4 bg-dark-card">
      <div className="container max-w-6xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="text-center mb-16"
        >
          <motion.span variants={fadeUp} className="text-cyan text-sm tracking-[0.3em] uppercase">Membership</motion.span>
          <motion.h2 variants={fadeUp} className="font-display text-4xl sm:text-5xl md:text-6xl text-white mt-4 tracking-wider">
            CHOOSE YOUR <span className="text-cyan">EDGE</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-gray-400 text-lg max-w-2xl mx-auto mt-6">
            All plans include a 14-day free trial. Cancel anytime.
          </motion.p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative bg-dark border rounded-2xl p-8 transition-all duration-300 ${
                plan.popular
                  ? "border-cyan shadow-neon scale-105"
                  : "border-dark-surface hover:border-cyan/30"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan text-dark text-xs font-bold px-4 py-1 rounded-full tracking-wider uppercase">
                  Most Popular
                </span>
              )}
              <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-display text-cyan">{plan.price}</span>
                <span className="text-gray-500 text-sm">{plan.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-gray-400 text-sm">
                    <FaCheck className="text-cyan mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className={`block text-center font-bold py-3.5 rounded-lg transition-all duration-300 ${
                  plan.popular
                    ? "bg-cyan text-dark hover:shadow-neon"
                    : "border border-gray-600 text-gray-300 hover:border-cyan hover:text-cyan"
                }`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Testimonials = () => {
  return (
    <section className="py-24 px-4 bg-dark">
      <div className="container max-w-6xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="text-center mb-16"
        >
          <motion.span variants={fadeUp} className="text-cyan text-sm tracking-[0.3em] uppercase">Testimonials</motion.span>
          <motion.h2 variants={fadeUp} className="font-display text-4xl sm:text-5xl md:text-6xl text-white mt-4 tracking-wider">
            WHAT OUR <span className="text-cyan">MEMBERS SAY</span>
          </motion.h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="bg-dark-card border border-dark-surface rounded-2xl p-8 hover:border-cyan/20 transition-all duration-300"
            >
              <FaQuoteLeft className="text-cyan/30 text-3xl mb-4" />
              <p className="text-gray-300 leading-relaxed mb-6 italic">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <img src={t.img} alt={t.name} className="w-12 h-12 rounded-full object-cover" loading="lazy" />
                <div>
                  <h4 className="text-white font-semibold">{t.name}</h4>
                  <p className="text-gray-500 text-xs">{t.role}</p>
                </div>
                <div className="ml-auto flex gap-0.5">
                  {[...Array(t.rating)].map((_, idx) => (
                    <FaStar key={idx} className="text-yellow-400 text-xs" />
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const FinalCTA = () => {
  return (
    <section className="relative py-32 px-4 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-dark via-dark-card to-dark z-0" />
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: "radial-gradient(circle at 50% 50%, rgba(0,255,209,0.2) 0%, transparent 60%)",
      }} />
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: "linear-gradient(rgba(0,255,209,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,209,0.1) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      <div className="relative z-10 container max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <FaFire className="text-6xl text-cyan mx-auto mb-6" />
          <h2 className="font-display text-5xl sm:text-7xl md:text-8xl text-white tracking-wider leading-none mb-6">
            READY TO <span className="text-cyan">TRANSFORM</span>?
          </h2>
          <p className="text-gray-400 text-xl max-w-2xl mx-auto mb-10">
            Join thousands of members who transformed their lives from home.
            Start your 14-day free trial today — no commitment, no risk.
          </p>
          <Link
            to="/register"
            className="group inline-flex items-center gap-3 bg-cyan text-dark font-bold px-10 py-5 rounded-lg text-xl tracking-wider hover:shadow-neon transition-all duration-300"
          >
            Claim Your Free Trial <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="bg-dark-card border-t border-dark-surface py-16 px-4">
      <div className="container max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <FaDumbbell className="text-cyan text-2xl" />
              <span className="font-display text-xl tracking-widest text-white">IRONPHYSIQUE</span>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed">
              Premium home training platform. AI-powered workouts, expert coaches, personalized nutrition.
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">Quick Links</h4>
            <ul className="space-y-2 text-gray-500 text-sm">
              {["About", "Services", "Pricing", "Coaches", "Contact"].map((l) => (
                <li key={l}><a href={`#${l.toLowerCase()}`} className="hover:text-cyan transition">{l}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">Hours</h4>
            <ul className="space-y-2 text-gray-500 text-sm">
              <li>Mon–Fri: 5AM – 11PM</li>
              <li>Sat: 6AM – 10PM</li>
              <li>Sun: 7AM – 8PM</li>
              <li className="text-cyan font-medium">Open 365 days</li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">Follow Us</h4>
            <div className="flex gap-4 text-gray-500 text-xl">
              <FaFacebook className="hover:text-cyan transition cursor-pointer" />
              <FaInstagram className="hover:text-cyan transition cursor-pointer" />
              <FaTwitter className="hover:text-cyan transition cursor-pointer" />
              <FaTiktok className="hover:text-cyan transition cursor-pointer" />
            </div>
          </div>
        </div>
        <div className="border-t border-dark-surface pt-8 text-center text-gray-600 text-xs uppercase tracking-wider">
          © 2026 IRONPHYSIQUE. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

/* ===== MAIN PAGE ===== */
export const Home = () => {
  return (
    <div className="bg-dark text-white overflow-x-hidden">
      <Header />
      <Hero />
      <About />
      <Services />
      <Coaches />
      <Pricing />
      <Testimonials />
      <FinalCTA />
      <Footer />
    </div>
  );
};
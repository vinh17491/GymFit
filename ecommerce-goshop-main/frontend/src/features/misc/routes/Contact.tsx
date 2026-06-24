import { Link } from "react-router-dom";
import { FaDumbbell, FaPaperPlane, FaMapMarkerAlt, FaPhone, FaClock } from "react-icons/fa";

export const Contact = () => {
  return (
    <div className="min-h-screen bg-dark text-white pt-24">
      <div className="container max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <span className="text-cyan text-sm tracking-[0.3em] uppercase">Contact</span>
          <h1 className="font-display text-4xl sm:text-6xl text-white mt-4 tracking-wider">
            GET IN <span className="text-cyan">TOUCH</span>
          </h1>
          <p className="text-gray-400 mt-4 max-w-xl mx-auto">Have questions? We'd love to hear from you.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-8">
            {[
              { icon: FaMapMarkerAlt, title: "Address", detail: "123 Fitness Street, District 1, HCMC" },
              { icon: FaPhone, title: "Phone", detail: "+84 28 1234 5678" },
              { icon: FaClock, title: "Hours", detail: "Mon–Sun: 6AM – 10PM" },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-4">
                <item.icon className="text-cyan text-xl mt-1" />
                <div>
                  <h3 className="font-bold text-white">{item.title}</h3>
                  <p className="text-gray-400">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="First Name" className="bg-dark-card border border-dark-surface rounded-lg px-4 py-3 text-white focus:border-cyan outline-none transition" />
              <input type="text" placeholder="Last Name" className="bg-dark-card border border-dark-surface rounded-lg px-4 py-3 text-white focus:border-cyan outline-none transition" />
            </div>
            <input type="email" placeholder="Email" className="w-full bg-dark-card border border-dark-surface rounded-lg px-4 py-3 text-white focus:border-cyan outline-none transition" />
            <textarea rows={4} placeholder="Message" className="w-full bg-dark-card border border-dark-surface rounded-lg px-4 py-3 text-white focus:border-cyan outline-none transition resize-none"></textarea>
            <button type="submit" className="flex items-center gap-2 bg-cyan text-dark font-bold px-6 py-3 rounded-lg hover:shadow-neon transition-all">
              Send Message <FaPaperPlane />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

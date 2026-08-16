import React from 'react';
import { motion } from 'framer-motion';
import { Mail, MapPin, Phone, Send } from 'lucide-react';

export default function ContactPage() {
  const formFields = [
    { name: 'name', label: 'Your Name', type: 'text', placeholder: 'John Doe' },
    { name: 'email', label: 'Email', type: 'email', placeholder: 'john@example.com' },
    { name: 'subject', label: 'Subject', type: 'text', placeholder: 'How can we help?' },
    { name: 'message', label: 'Message', type: 'textarea', placeholder: 'Tell us more...' }
  ];

  return (
    <div className="min-h-screen bg-[#020617] py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-bold text-white mb-8">
          Contact Us
        </motion.h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
            <div className="bg-[#0f172a] rounded-xl p-8 border border-[#1e293b]">
              <h2 className="text-2xl font-semibold text-white mb-6">Get In Touch</h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-[#2563eb]/20 flex items-center justify-center shrink-0">
                    <MapPin className="text-[#60a5fa]" size={24} />
                  </div>
                  <div><h3 className="font-semibold text-white">Visit Us</h3><p className="text-[#94a3b8]">123 Fitness Street, Health City, HC 12345</p></div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-[#2563eb]/20 flex items-center justify-center shrink-0">
                    <Phone className="text-[#60a5fa]" size={24} />
                  </div>
                  <div><h3 className="font-semibold text-white">Call Us</h3><p className="text-[#94a3b8]">+1 (555) 123-4567</p></div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-[#2563eb]/20 flex items-center justify-center shrink-0">
                    <Mail className="text-[#60a5fa]" size={24} />
                  </div>
                  <div><h3 className="font-semibold text-white">Email Us</h3><p className="text-[#94a3b8]">support@gymer.com</p></div>
                </div>
              </div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
            className="bg-[#0f172a] rounded-xl p-8 border border-[#1e293b]">
            <h2 className="text-2xl font-semibold text-white mb-6">Send a Message</h2>
            <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
              {formFields.map((f) => (
                <div key={f.name}>
                  <label htmlFor={f.name} className="block text-sm font-medium text-white mb-2">{f.label}</label>
                  {f.type === 'textarea' ? (
                    <textarea id={f.name} rows={5} placeholder={f.placeholder}
                      className="w-full rounded-lg border border-[#1e293b] bg-[#020617] px-4 py-3 text-white placeholder-[#64748b] focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 transition-all" />
                  ) : (
                    <input type={f.type} id={f.name} placeholder={f.placeholder}
                      className="w-full rounded-lg border border-[#1e293b] bg-[#020617] px-4 py-3 text-white placeholder-[#64748b] focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 transition-all" />
                  )}
                </div>
              ))}
              <button type="submit" className="w-full rounded-lg bg-[#2563eb] px-8 py-4 text-lg font-semibold text-white transition-all hover:bg-[#1d4ed8]">
                <Send className="inline mr-2" size={20} />Send Message
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
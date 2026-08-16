import React from 'react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#020617] py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-5xl font-bold text-white mb-8">About Gymer</h1>
        <div className="bg-[#0f172a] rounded-xl p-8 border border-[#1e293b]">
          <h2 className="text-2xl font-semibold text-white mb-4">Our Mission</h2>
          <p className="text-[#94a3b8] mb-6">
            At Gymer, we believe fitness should be accessible to everyone. Our mission is to create a comprehensive
            platform that combines personalized workout plans, expert coaching, and community support to help you
            achieve your fitness goals.
          </p>
          <h2 className="text-2xl font-semibold text-white mb-4 mt-8">Our Team</h2>
          <p className="text-[#94a3b8]">
            We are a team of passionate fitness enthusiasts, developers, and experts dedicated to creating
            the best fitness experience for our users.
          </p>
        </div>
      </div>
    </div>
  );
}
import { useState } from 'react';

interface Props { onSearch: (q: string) => void; }

export default function ProductSearchBar({ onSearch }: Props) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search products..."
          className="w-full px-4 py-2 pl-10 bg-dark-800 text-white rounded-xl border border-dark-700 focus:border-orange-500/50 focus:outline-none text-sm transition-all duration-300"
        />
        <svg className="absolute left-3 top-2.5 h-4 w-4 text-dark-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </form>
  );
}

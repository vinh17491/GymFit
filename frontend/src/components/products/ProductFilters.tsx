interface Filters { category: string; minPrice: number; maxPrice: number; brand: string; inStock: boolean; featured: boolean; sort: string; }
interface Props { filters: Filters; onChange: (f: Partial<Filters>) => void; onClose: () => void; }

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'name', label: 'Name A-Z' },
];

export default function ProductFilters({ filters, onChange, onClose }: Props) {
  const rangeInput = (label: string, key: 'minPrice' | 'maxPrice') => (
    <div>
      <label className="block text-sm text-gray-400 mb-1">{label}</label>
      <input
        type="number"
        value={filters[key]}
        onChange={e => onChange({ [key]: Number(e.target.value) })}
        className="w-full px-3 py-2 bg-dark-800 text-white rounded-xl border border-dark-700 focus:border-orange-500/50 focus:outline-none text-sm transition-all duration-300"
        min={0}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm text-gray-400 mb-2">Sort By</label>
        <select
          value={filters.sort}
          onChange={e => onChange({ sort: e.target.value })}
          className="w-full px-3 py-2 bg-dark-800 text-white rounded-xl border border-dark-700 focus:border-orange-500/50 focus:outline-none text-sm transition-all duration-300"
        >
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-2">Price Range</h3>
        <div className="grid grid-cols-2 gap-2">
          {rangeInput('Min $', 'minPrice')}
          {rangeInput('Max $', 'maxPrice')}
        </div>
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={filters.inStock}
            onChange={e => onChange({ inStock: e.target.checked })}
            className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-orange-500 focus:ring-orange-500/30 focus:ring-offset-0"
          />
          <span className="text-sm text-gray-300 group-hover:text-white transition-colors">In Stock Only</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={filters.featured}
            onChange={e => onChange({ featured: e.target.checked })}
            className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-orange-500 focus:ring-orange-500/30 focus:ring-offset-0"
          />
          <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Featured Only</span>
        </label>
      </div>
    </div>
  );
}

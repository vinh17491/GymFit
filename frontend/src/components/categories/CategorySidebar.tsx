interface Category { id: number; name: string; slug: string; product_count: number; icon?: string; }
interface Props {
  categories: Category[];
  selected: string;
  onChange: (slug: string) => void;
}

export default function CategorySidebar({ categories, selected, onChange }: Props) {
  return (
    <div className="space-y-1">
      <button
        onClick={() => onChange('')}
        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
          !selected ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
        }`}
      >
        All Categories
      </button>
      {categories.map(cat => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.slug)}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex justify-between ${
            selected === cat.slug ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
          }`}
        >
          <span>{cat.name}</span>
          <span className="text-xs opacity-70">({cat.product_count})</span>
        </button>
      ))}
    </div>
  );
}

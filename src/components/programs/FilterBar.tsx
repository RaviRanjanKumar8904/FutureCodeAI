import { Search, X } from 'lucide-react';

interface FilterBarProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  categoryFilter: string;
  setCategoryFilter: (val: string) => void;
  categories: string[];
}

export default function FilterBar({
  searchQuery, setSearchQuery,
  categoryFilter, setCategoryFilter,
  categories
}: FilterBarProps) {
  const allOptions = ['All', ...categories];

  return (
    <div className="bg-white/95 backdrop-blur-md sticky top-[60px] sm:top-[72px] md:top-[84px] z-30 border-b border-gray-100 shadow-sm py-3 sm:py-4">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-4 items-center">
          
          {/* Search Box */}
          <div className="relative w-full">
            <Search className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search programs (e.g. AI, React, C++, Full-Stack)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-gray-200 text-slate-900 rounded-2xl py-2.5 sm:py-3 pl-10 sm:pl-12 pr-10 text-sm sm:text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-400 font-medium"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Category Chips for Touch Phones */}
        {allOptions.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
            {allOptions.map((cat) => {
              const isSelected = categoryFilter === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-all active:scale-95 cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-primary text-white shadow-md shadow-primary/25'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                  }`}
                >
                  {cat === 'All' ? 'All Programs' : cat}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

import React from 'react';
import {
  Layers,
  Coffee,
  Smartphone,
  Sparkles,
  Headphones,
  Briefcase,
  Utensils,
  Car,
  Home,
  LucideIcon,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useMarketplace } from '../context/MarketplaceContext';

const iconMap: Record<string, LucideIcon> = {
  Coffee,
  Smartphone,
  Sparkles,
  Headphones,
  Briefcase,
  Utensils,
  Car,
  Home,
};

export const CategoryBar: React.FC = () => {
  const { t, localize } = useLanguage();
  const { categories, categoryCounts, selectedCategory, setSelectedCategory } = useMarketplace();

  return (
    <div className="bg-white border-b border-slate-200/80 shadow-xs py-3 sticky top-20 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          
          {/* 'All Categories' Button */}
          <button
            onClick={() => setSelectedCategory('all')}
            className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-emerald-800 text-white shadow-md shadow-emerald-900/15'
                : 'bg-slate-100 hover:bg-slate-200/70 text-slate-700'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span>{t('categories.all')}</span>
            <span
              className={`ml-1 text-[11px] px-1.5 py-0.5 rounded-full font-bold ${
                selectedCategory === 'all'
                  ? 'bg-emerald-950/60 text-amber-300'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {categoryCounts['all'] || 0}
            </span>
          </button>

          {/* Individual Category Buttons */}
          {categories.map((cat) => {
            const Icon = iconMap[cat.iconName] || Layers;
            const count = categoryCounts[cat.id] || 0;
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-800 text-white shadow-md shadow-emerald-900/15'
                    : 'bg-slate-100 hover:bg-slate-200/70 text-slate-700'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-amber-400' : 'text-emerald-700'}`} />
                <span>{localize(cat.name)}</span>
                <span
                  className={`ml-1 text-[11px] px-1.5 py-0.5 rounded-full font-bold ${
                    isSelected
                      ? 'bg-emerald-950/60 text-amber-300'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}

        </div>
      </div>
    </div>
  );
};

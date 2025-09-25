import React, { useState, useMemo } from 'react';
import { Search, Filter, RotateCcw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { dummyData } from '../utils/dummy';
import ThemeToggle from './ThemeToggle';

// Types definition
export interface CampaignData {
  date: string;
  week: string;
  editor: string;
  painPoint: string;
  product: string;
  production: string;
  adType: string;
  format: string;
  landingPage: string;
  totalAssets: number;
  hits: number;
  week1: number;
  week2: number;
  week3: number;
  week4: number;
}

interface FilterState {
  week: string;
  editor: string;
  painPoint: string;
  product: string;
  production: string;
  adType: string;
  format: string;
  landingPage: string;
  purchaseThreshold: string;
}

interface FilterOptions {
  [key: string]: string[];
}



const FilterSelect: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}> = ({ label, value, onChange, options }) => (
  <div className="space-y-2">
    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
                 bg-white text-sm text-gray-900
                 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700"
    >
      {options.map((option) => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  </div>
);

const PerformanceCell: React.FC<{
  current: number;
  previous: number;
  target: number;
}> = ({ current, previous, target }) => {
  const getTrend = () => (current > previous ? 'up' : current < previous ? 'down' : 'neutral');
  const trend = getTrend();
  const meetsTarget = current >= target;

  const trendConfig = {
    up:      { icon: TrendingUp,   color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
    down:    { icon: TrendingDown, color: 'text-red-600 dark:text-red-400',     bg: 'bg-red-50 dark:bg-red-900/20' },
    neutral: { icon: Minus,        color: 'text-gray-600 dark:text-gray-300',   bg: 'bg-gray-50 dark:bg-slate-800' },
  };

  const config = trendConfig[trend];
  const Icon = config.icon;

  return (
    <td className={`px-4 py-3 ${config.bg} ${meetsTarget ? 'border-l-4 border-green-400' : ''} dark:border-green-500`}>
      <div className="flex items-center justify-between">
        <span className={`font-medium ${config.color}`}>{current.toFixed(1)}%</span>
        <Icon className={`w-4 h-4 ${config.color}`} />
      </div>
    </td>
  );
};

const FacebookAdsDashboard: React.FC = () => {
  const [filters, setFilters] = useState<FilterState>({
    week: 'All',
    editor: 'All',
    painPoint: 'All',
    product: 'All',
    production: 'All',
    adType: 'All',
    format: 'All',
    landingPage: 'All',
    purchaseThreshold: 'All'
  });

  const [searchTerm, setSearchTerm] = useState<string>('');

  // Generate filter options
  const filterOptions: FilterOptions = useMemo(() => {
    const getUniqueValues = (field: keyof CampaignData): string[] => {
      const values = dummyData.map(item => String(item[field])).filter(Boolean);
      return ['All', ...Array.from(new Set(values))].sort();
    };

    return {
      week: getUniqueValues('week'),
      editor: getUniqueValues('editor'),
      painPoint: getUniqueValues('painPoint'),
      product: getUniqueValues('product'),
      production: getUniqueValues('production'),
      adType: getUniqueValues('adType'),
      format: getUniqueValues('format'),
      landingPage: getUniqueValues('landingPage'),
      purchaseThreshold: ['All', '10', '15', '20', '25']
    };
  }, []);

  // Filter data
  const filteredData: CampaignData[] = useMemo(() => {
    return dummyData.filter(item => {
      const matchesFilters = Object.entries(filters).every(([key, value]) => {
        if (value === 'All') return true;
        return String(item[key as keyof CampaignData]) === value;
      });

      const matchesSearch = searchTerm === '' || 
        Object.values(item).some(value => 
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        );

      return matchesFilters && matchesSearch;
    });
  }, [filters, searchTerm]);

  // Calculate totals
  const totals = useMemo(() => {
    if (filteredData.length === 0) {
      return { totalAssets: 0, hits: 0, week1: 0, week2: 0, week3: 0, week4: 0 };
    }
    
    return {
      totalAssets: filteredData.reduce((sum, item) => sum + item.totalAssets, 0),
      hits: filteredData.reduce((sum, item) => sum + item.hits, 0),
      week1: filteredData.reduce((sum, item) => sum + item.week1, 0) / filteredData.length,
      week2: filteredData.reduce((sum, item) => sum + item.week2, 0) / filteredData.length,
      week3: filteredData.reduce((sum, item) => sum + item.week3, 0) / filteredData.length,
      week4: filteredData.reduce((sum, item) => sum + item.week4, 0) / filteredData.length,
    };
  }, [filteredData]);

  const resetFilters = () => {
    setFilters({
      week: 'All',
      editor: 'All',
      painPoint: 'All',
      product: 'All',
      production: 'All',
      adType: 'All',
      format: 'All',
      landingPage: 'All',
      purchaseThreshold: 'All'
    });
    setSearchTerm('');
  };

  const updateFilter = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Left Sidebar - Filters */}
      <div className="w-80 bg-white dark:bg-slate-900/40 border-r border-gray-200 dark:border-slate-700/60 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Filters</h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Refine your campaign data</p>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search campaigns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg
                           bg-white text-gray-900 placeholder-gray-400
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           dark:bg-slate-800 dark:text-slate-100 dark:placeholder-gray-500 dark:border-slate-700"
              />
            </div>
          </div>

          {/* Reset Button */}
          <button
            onClick={resetFilters}
            className="w-full mb-6 flex items-center justify-center gap-2 py-2 px-4
                       bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors
                       dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100"
          >
            <RotateCcw className="w-4 h-4" />
            Reset All Filters
          </button>

          {/* Filter Controls */}
          <div className="space-y-4">
            {/* (FilterSelect components unchanged; they already have dark classes) */}
            <FilterSelect label="Week" value={filters.week} onChange={(v) => updateFilter('week', v)} options={filterOptions.week} />
            <FilterSelect label="Editor" value={filters.editor} onChange={(v) => updateFilter('editor', v)} options={filterOptions.editor} />
            <FilterSelect label="Pain Point" value={filters.painPoint} onChange={(v) => updateFilter('painPoint', v)} options={filterOptions.painPoint} />
            <FilterSelect label="Product" value={filters.product} onChange={(v) => updateFilter('product', v)} options={filterOptions.product} />
            <FilterSelect label="Production" value={filters.production} onChange={(v) => updateFilter('production', v)} options={filterOptions.production} />
            <FilterSelect label="Ad Type" value={filters.adType} onChange={(v) => updateFilter('adType', v)} options={filterOptions.adType} />
            <FilterSelect label="Format" value={filters.format} onChange={(v) => updateFilter('format', v)} options={filterOptions.format} />
            <FilterSelect label="Landing Page" value={filters.landingPage} onChange={(v) => updateFilter('landingPage', v)} options={filterOptions.landingPage} />
            <FilterSelect label="Purchase Threshold" value={filters.purchaseThreshold} onChange={(v) => updateFilter('purchaseThreshold', v)} options={filterOptions.purchaseThreshold} />
          </div>

          {/* Active Filters Count */}
          <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-sm text-blue-800 dark:text-blue-300">
              <span className="font-medium">{filteredData.length}</span> campaigns match your filters
            </div>
          </div>
        </div>
      </div>

      {/* Right Content - Dashboard */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white dark:bg-slate-900/40 border-b border-gray-200 dark:border-slate-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Facebook Ads Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Monitor campaign performance across time periods</p>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors
                                 dark:bg-blue-500 dark:hover:bg-blue-600">
                Export Data
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="bg-white dark:bg-slate-900/40 border-b border-gray-200 dark:border-slate-700 px-6 py-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totals.totalAssets}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Assets</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totals.hits}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Hits</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{totals.week1.toFixed(1)}%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Avg Week 1</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totals.week4.toFixed(1)}%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Avg Week 4</div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <div className="bg-white dark:bg-slate-900/40">
            <table className="w-full">
              <thead className="bg-gray-900 text-white dark:bg-slate-800 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Assets</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Hits</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Week 1 (+7)
                    <div className="text-xs text-gray-300 dark:text-gray-400">Target: &lt; 10%</div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Week 2 (+14)
                    <div className="text-xs text-gray-300 dark:text-gray-400">Target: &lt; 20%</div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Week 3 (+21)
                    <div className="text-xs text-gray-300 dark:text-gray-400">Target &lt; 25%</div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Week 4 (+28)
                    <div className="text-xs text-gray-300 dark:text-gray-400">Target: &lt; 25%</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, index) => {
                  const nextRow = filteredData[index + 1];
                  return (
                    <tr key={row.date} className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/60">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{row.date}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{row.totalAssets}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{row.hits}</td>
                      <PerformanceCell current={row.week1} previous={nextRow?.week1 || 0} target={10} />
                      <PerformanceCell current={row.week2} previous={nextRow?.week2 || 0} target={20} />
                      <PerformanceCell current={row.week3} previous={nextRow?.week3 || 0} target={25} />
                      <PerformanceCell current={row.week4} previous={nextRow?.week4 || 0} target={25} />
                    </tr>
                  );
                })}
                <tr className="bg-gray-100 dark:bg-slate-800 font-semibold border-t-2 border-gray-300 dark:border-slate-700">
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3">{totals.totalAssets}</td>
                  <td className="px-4 py-3">{totals.hits}</td>
                  <td className="px-4 py-3">{totals.week1.toFixed(1)}%</td>
                  <td className="px-4 py-3">{totals.week2.toFixed(1)}%</td>
                  <td className="px-4 py-3">{totals.week3.toFixed(1)}%</td>
                  <td className="px-4 py-3">{totals.week4.toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default FacebookAdsDashboard;
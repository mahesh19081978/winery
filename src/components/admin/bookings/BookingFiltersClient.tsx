'use client';

import React, { useState } from 'react';
import { Search, X, Filter } from 'lucide-react';

interface BookingFiltersClientProps {
  onSearch: (search: string) => void;
  onStatusFilter: (status: string) => void;
  onDateFilter: (dateFrom: string, dateTo: string) => void;
  onClearFilters: () => void;
  currentSearch: string;
  currentStatus: string;
  currentDateFrom: string;
  currentDateTo: string;
}

export function BookingFiltersClient({
  onSearch,
  onStatusFilter,
  onDateFilter,
  onClearFilters,
  currentSearch,
  currentStatus,
  currentDateFrom,
  currentDateTo,
}: BookingFiltersClientProps) {
  const [searchInput, setSearchInput] = useState(currentSearch);
  const [showFilters, setShowFilters] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchInput);
  };

  const handleClear = () => {
    setSearchInput('');
    onClearFilters();
  };

  const hasActiveFilters = currentStatus || currentDateFrom || currentDateTo || currentSearch;

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search by booking number or guest name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#6c2432] focus:border-[#6c2432] transition"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => { setSearchInput(''); onSearch(''); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border transition ${
            showFilters || hasActiveFilters
              ? 'bg-[#461822]/5 border-[#461822]/20 text-[#6c2432]'
              : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Filters</span>
          {hasActiveFilters && (
            <span className="w-4 h-4 rounded-full bg-[#6c2432] text-white text-[10px] flex items-center justify-center">
              !
            </span>
          )}
        </button>
      </div>

      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-3 p-3 bg-[#faf8f5] rounded-lg border border-stone-200/80">
          <div className="flex-1 space-y-1">
            <label className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Status</label>
            <select
              value={currentStatus}
              onChange={(e) => onStatusFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#6c2432]"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CHECKED_IN">Checked In</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="NO_SHOW">No Show</option>
            </select>
          </div>

          <div className="flex-1 space-y-1">
            <label className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Date From</label>
            <input
              type="date"
              value={currentDateFrom}
              onChange={(e) => onDateFilter(e.target.value, currentDateTo)}
              className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#6c2432]"
            />
          </div>

          <div className="flex-1 space-y-1">
            <label className="text-[10px] uppercase font-mono tracking-wider text-stone-500">Date To</label>
            <input
              type="date"
              value={currentDateTo}
              onChange={(e) => onDateFilter(currentDateFrom, e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#6c2432]"
            />
          </div>

          {hasActiveFilters && (
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition"
              >
                Clear All
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

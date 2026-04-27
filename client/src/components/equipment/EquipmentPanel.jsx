import React, { useState, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Search, RefreshCw } from 'lucide-react';
import EquipmentStats from './EquipmentStats';
import EquipmentCard from './EquipmentCard';
import { CATEGORIES, SORT_OPTIONS } from '../../utils/equipmentConfig';

const STATUS_FILTERS = ['All', 'Available', 'Busy', 'Maintenance'];

export default function EquipmentPanel({
  equipment,
  stats,
  loading,
  userLat,
  userLng,
  onViewOnMap,
  onBookNow,
  onViewDetails,
  onRefresh,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [radiusKm, setRadiusKm] = useState(10);
  const [sortBy, setSortBy] = useState('distance');

  // Calculate distances and filter/sort
  const processedEquipment = useMemo(() => {
    let items = equipment.map((e) => {
      let distanceKm = null;
      if (userLat != null && userLng != null) {
        const R = 6371;
        const dLat = ((e.lat - userLat) * Math.PI) / 180;
        const dLng = ((e.lng - userLng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((userLat * Math.PI) / 180) *
            Math.cos((e.lat * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2;
        distanceKm = parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
      }
      return { ...e, distanceKm };
    });

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          e.owner.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (selectedCategory !== 'All') {
      items = items.filter((e) => e.category === selectedCategory);
    }

    // Status filter
    if (selectedStatus !== 'All') {
      items = items.filter((e) => e.status === selectedStatus.toLowerCase());
    }

    // Radius filter (only if user location is known)
    if (userLat != null && userLng != null) {
      items = items.filter((e) => e.distanceKm != null && e.distanceKm <= radiusKm);
    }

    // Sort
    items.sort((a, b) => {
      if (sortBy === 'distance') {
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      }
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'price') return a.pricePerHour - b.pricePerHour;
      return 0;
    });

    return items;
  }, [equipment, searchQuery, selectedCategory, selectedStatus, radiusKm, sortBy, userLat, userLng]);

  return (
    <aside className="w-[420px] bg-white border-l border-gray-200 flex flex-col shrink-0 z-10 shadow-[-4px_0_24px_rgba(0,0,0,0.02)]">
      {/* Header & Search */}
      <div className="p-5 border-b border-gray-100 bg-gray-50/50">
        <EquipmentStats stats={stats} />

        {/* Search */}
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search equipment, category, owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-10 py-2 bg-white border border-gray-200 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-shadow"
          />
          <button
            onClick={onRefresh}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>

        {/* Category pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Status tabs */}
        <div className="flex gap-1 mt-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setSelectedStatus(s)}
              className={`flex-1 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                selectedStatus === s
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Radius slider & Sort */}
        <div className="flex items-center gap-3 mt-3">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-0.5">
              <label className="text-[10px] font-medium text-gray-500 uppercase">Radius</label>
              <span className="text-[10px] font-semibold text-gray-700">{radiusKm} km</span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              value={radiusKm}
              onChange={(e) => setRadiusKm(parseInt(e.target.value))}
              className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium text-gray-500 uppercase block mb-0.5">Sort</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-[11px] px-2 py-1 border border-gray-200 rounded bg-white text-gray-700 focus:outline-none"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Equipment list */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Equipment ({processedEquipment.length})
          </h3>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {processedEquipment.map((equip) => (
                <EquipmentCard
                  key={equip.id}
                  equipment={equip}
                  distanceKm={equip.distanceKm}
                  onViewOnMap={onViewOnMap}
                  onBookNow={onBookNow}
                  onViewDetails={onViewDetails}
                />
              ))}
            </AnimatePresence>

            {processedEquipment.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-400 text-sm">
                No equipment found matching your filters
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

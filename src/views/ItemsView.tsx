import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  SlidersHorizontal,
  Package,
  RefreshCw,
  CreditCard,
  Sparkles,
  Inbox,
} from 'lucide-react';
import { WorthItem, ItemStats, ItemCategory, ItemStatus } from '../types';
import { ItemCard } from '../components/ItemCard';

interface ItemsViewProps {
  items: WorthItem[];
  itemStats: ItemStats[];
  onOpenAddItem: () => void;
  onSelectItem: (item: WorthItem) => void;
  onQuickAddOne: (item: WorthItem, e: React.MouseEvent) => void;
  onOpenLogModal: (item: WorthItem) => void;
  onOpenReceipt?: (stats: ItemStats) => void;
}

type SortOption = 'recent' | 'price_desc' | 'progress_desc' | 'last_used';

export const ItemsView: React.FC<ItemsViewProps> = ({
  items,
  itemStats,
  onOpenAddItem,
  onSelectItem,
  onQuickAddOne,
  onOpenLogModal,
  onOpenReceipt,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<ItemStatus | 'all'>('all');
  const [sortOption, setSortOption] = useState<SortOption>('recent');

  // Filter and sort items
  const filteredAndSortedStats = useMemo(() => {
    return itemStats
      .filter((st) => {
        // Name search
        if (
          searchTerm.trim() &&
          !st.item.name.toLowerCase().includes(searchTerm.toLowerCase().trim())
        ) {
          return false;
        }

        // Category filter
        if (selectedCategory !== 'all' && st.item.category !== selectedCategory) {
          return false;
        }

        // Status filter
        if (selectedStatus !== 'all' && st.item.status !== selectedStatus) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOption === 'price_desc') {
          return b.item.purchasePrice - a.item.purchasePrice;
        }
        if (sortOption === 'progress_desc') {
          return b.progress - a.progress;
        }
        if (sortOption === 'last_used') {
          const aDate = a.lastUsedAt || a.item.purchaseDate;
          const bDate = b.lastUsedAt || b.item.purchaseDate;
          return bDate.localeCompare(aDate);
        }
        // default: recent created
        return b.item.createdAt.localeCompare(a.item.createdAt);
      });
  }, [itemStats, searchTerm, selectedCategory, selectedStatus, sortOption]);

  const categoryFilters: { id: ItemCategory | 'all'; label: string }[] = [
    { id: 'all', label: '전체' },
    { id: 'item', label: '물건' },
    { id: 'subscription', label: '구독' },
    { id: 'membership', label: '회원권' },
    { id: 'other', label: '기타' },
  ];

  const statusFilters: { id: ItemStatus | 'all'; label: string }[] = [
    { id: 'all', label: '전체 상태' },
    { id: 'active', label: '사용 중' },
    { id: 'completed', label: '사용 종료' },
    { id: 'archived', label: '보관' },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top action and search header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">내 소비 관리</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            등록된 소비 {items.length}개를 추적하고 있습니다.
          </p>
        </div>

        <button
          onClick={onOpenAddItem}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm shadow-emerald-600/20"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>새 소비 등록</span>
        </button>
      </div>

      {/* Search and Sort controls */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
          <input
            type="text"
            placeholder="소비 이름으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/90 rounded-2xl text-sm text-slate-900 focus:outline-none focus:border-emerald-600 transition-colors shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Status selector */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="px-3.5 py-2.5 bg-white border border-slate-200/90 rounded-2xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-600 shadow-2xs"
          >
            {statusFilters.map((st) => (
              <option key={st.id} value={st.id}>
                {st.label}
              </option>
            ))}
          </select>

          {/* Sort selector */}
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            className="px-3.5 py-2.5 bg-white border border-slate-200/90 rounded-2xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-600 shadow-2xs"
          >
            <option value="recent">최근 등록순</option>
            <option value="price_desc">구매 금액 높은 순</option>
            <option value="progress_desc">목표 달성률 높은 순</option>
            <option value="last_used">최근 사용순</option>
          </select>
        </div>
      </div>

      {/* Category Filter Pills (YouTube / Instagram style) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categoryFilters.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 text-xs font-bold rounded-full transition-all whitespace-nowrap active:scale-95 shadow-2xs ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200/80 text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Items Grid */}
      {filteredAndSortedStats.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-slate-200 bg-white">
          <Inbox className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700">해당하는 소비가 없습니다</h3>
          <p className="text-xs text-slate-400 mt-1">
            {searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all'
              ? '검색어나 필터 조건을 변경해 보세요.'
              : '새로운 소비를 등록하여 가치를 추적해 보세요!'}
          </p>
          {(searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setSelectedStatus('all');
              }}
              className="mt-3 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            >
              필터 초기화
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredAndSortedStats.map((stats) => (
            <ItemCard
              key={stats.item.id}
              stats={stats}
              onClick={() => onSelectItem(stats.item)}
              onQuickAddOne={(e) => onQuickAddOne(stats.item, e)}
              onOpenLogModal={(e) => {
                e.stopPropagation();
                onOpenLogModal(stats.item);
              }}
              onOpenReceipt={
                onOpenReceipt
                  ? (e) => {
                      e.stopPropagation();
                      onOpenReceipt(stats);
                    }
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};

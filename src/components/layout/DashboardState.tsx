import { AlertCircle, RefreshCw } from 'lucide-react';

export interface DashboardSkeletonProps {
  type?: 'cards' | 'table' | 'list' | 'stats';
  count?: number;
}

export function DashboardSkeleton({ type = 'cards', count = 3 }: DashboardSkeletonProps) {
  if (type === 'stats') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {Array.from({ length: count || 4 }).map((_, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-200 rounded w-1/2" />
              <div className="h-6 bg-slate-200 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
          <div className="h-5 bg-slate-200 rounded w-48" />
          <div className="h-8 bg-slate-200 rounded w-24" />
        </div>
        <div className="divide-y divide-gray-100">
          {Array.from({ length: count || 5 }).map((_, idx) => (
            <div key={idx} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
                <div className="space-y-1.5 flex-1 max-w-sm">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
              <div className="h-6 bg-slate-200 rounded-full w-20 hidden sm:block" />
              <div className="h-8 bg-slate-200 rounded-lg w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: count || 3 }).map((_, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-12 h-12 rounded-xl bg-slate-200 shrink-0" />
              <div className="space-y-2 flex-1 max-w-md">
                <div className="h-4 bg-slate-200 rounded w-3/5" />
                <div className="h-3 bg-slate-100 rounded w-2/5" />
              </div>
            </div>
            <div className="h-9 bg-slate-200 rounded-xl w-24 shrink-0" />
          </div>
        ))}
      </div>
    );
  }

  // Default 'cards'
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm flex flex-col">
          <div className="h-48 bg-slate-200 w-full" />
          <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="h-3 bg-slate-200 rounded w-1/4" />
              <div className="h-5 bg-slate-200 rounded w-4/5" />
              <div className="h-3 bg-slate-100 rounded w-full" />
              <div className="h-3 bg-slate-100 rounded w-2/3" />
            </div>
            <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="h-9 bg-slate-200 rounded-xl w-28" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export interface DashboardErrorProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function DashboardError({
  title = 'Failed to load content',
  message = 'We encountered an issue fetching this data from Firestore. Please check your internet connection or try again.',
  onRetry,
}: DashboardErrorProps) {
  return (
    <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-6 sm:p-8 text-center max-w-xl mx-auto my-6">
      <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center mx-auto mb-4">
        <AlertCircle size={24} />
      </div>
      <h3 className="text-lg font-bold text-rose-950 mb-1">{title}</h3>
      <p className="text-sm text-rose-700/90 mb-5 font-medium leading-relaxed">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-rose-600/20 cursor-pointer"
        >
          <RefreshCw size={15} />
          <span>Try Again</span>
        </button>
      )}
    </div>
  );
}

export default DashboardSkeleton;

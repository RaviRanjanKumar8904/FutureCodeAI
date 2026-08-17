import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { Activity, Clock, User, FileText, Trash2, Edit3, PlusCircle, Search, RefreshCw, CheckCircle2, ShieldAlert } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function ActivityLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('All');

  const fetchLogs = async () => {
    try {
      const q = query(collection(db, 'adminLogs'), orderBy('timestamp', 'desc'), limit(150));
      const snapshot = await getDocs(q);
      let data: any[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(data);
    } catch (error) {
      console.error("Error fetching logs:", error);
      toast.error("Failed to load activity logs");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATED': return <PlusCircle size={18} className="text-emerald-500" />;
      case 'UPDATED': return <Edit3 size={18} className="text-blue-500" />;
      case 'DELETED': return <Trash2 size={18} className="text-rose-500" />;
      case 'STATUS_CHANGE': return <CheckCircle2 size={18} className="text-amber-500" />;
      case 'INVITE': return <ShieldAlert size={18} className="text-purple-500" />;
      default: return <FileText size={18} className="text-slate-500" />;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATED': return <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase tracking-wider">Created</span>;
      case 'UPDATED': return <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wider">Updated</span>;
      case 'DELETED': return <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 uppercase tracking-wider">Deleted</span>;
      case 'STATUS_CHANGE': return <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wider">Status Change</span>;
      case 'INVITE': return <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 uppercase tracking-wider">Privilege</span>;
      default: return <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase tracking-wider">{action}</span>;
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesAction = filterAction === 'All' ? true : log.action === filterAction;
    const searchString = `${log.target || ''} ${log.details || ''} ${log.adminEmail || ''} ${log.action || ''}`.toLowerCase();
    const matchesSearch = searchString.includes(searchTerm.toLowerCase());
    return matchesAction && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Toaster position="top-center" />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
            <Activity size={24} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">System Audit Trail</h1>
            <p className="text-sm text-slate-500 font-medium">Real-time audit log of administrative changes, deletions, and promotions.</p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-60 self-start sm:self-auto"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin text-indigo-600' : 'text-slate-500'} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
          
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search audit logs by admin, target, or details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2 py-1">
              <span className="text-xs font-bold text-slate-400 pl-1">Action:</span>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="text-xs font-bold text-slate-700 bg-transparent py-1 pr-2 outline-none cursor-pointer"
              >
                <option value="All">All Actions</option>
                <option value="CREATED">Created</option>
                <option value="UPDATED">Updated</option>
                <option value="DELETED">Deleted</option>
                <option value="STATUS_CHANGE">Status Change</option>
                <option value="INVITE">Privileges</option>
              </select>
            </div>

            <div className="text-xs font-bold text-slate-500 px-2.5 py-1.5 bg-slate-200/60 rounded-lg">
              {filteredLogs.length} events
            </div>
          </div>

        </div>

        {/* List */}
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="py-24 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent mx-auto mb-3" />
              <p className="text-slate-400 font-medium text-sm">Loading activity trail...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-24 text-center">
              <Activity size={40} className="text-slate-300 mx-auto mb-3" />
              <p className="text-lg font-bold text-slate-700">No activity recorded</p>
              <p className="text-sm text-slate-400 mt-1">Actions performed in the admin panel will appear here automatically.</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row gap-4 sm:gap-5 items-start">
                
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200/80 shadow-sm">
                  {getActionIcon(log.action)}
                </div>
                
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {getActionBadge(log.action)}
                    <span className="text-sm font-bold text-slate-900">
                      {log.target}
                    </span>
                  </div>
                  
                  {log.details && (
                    <p className="text-xs text-slate-600 font-normal leading-relaxed">{log.details}</p>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-400 pt-1">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <User size={13} className="text-slate-400" /> {log.adminEmail}
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Clock size={13} className="text-slate-400" /> 
                      {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : 'Recent'}
                    </span>
                  </div>
                </div>
                
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

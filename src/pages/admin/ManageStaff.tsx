import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, setDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { Users, UserPlus, Trash2, Banknote, CalendarDays, Wallet } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { logAdminActivity } from '../../utils/adminLogger';

interface StaffEntry {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  address?: string;
  tenth?: string;
  twelfth?: string;
  degree?: string;
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
  upiId?: string;
  dateOfJoining?: string;
  salary?: number;
  salaryDueDate?: string;
  salaryPaid?: boolean;
  lastSalarySentAt?: string;
  addedBy?: string;
  createdAt?: string;
}

function encodeId(email: string) {
  return encodeURIComponent(email).replace(/\./g, '%2E');
}

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid date';
  return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getSalaryStatus(entry: StaffEntry) {
  if (entry.salaryPaid) return 'Paid';
  if (!entry.salaryDueDate) return 'Pending';
  const dueDate = new Date(entry.salaryDueDate);
  const now = new Date();
  if (dueDate <= now) return 'Due Now';
  const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 7) return 'Due Soon';
  return 'Upcoming';
}

function getStatusBadgeClasses(status: string) {
  switch (status) {
    case 'Paid':
      return 'bg-emerald-100 text-emerald-700';
    case 'Due Now':
      return 'bg-rose-100 text-rose-700';
    case 'Due Soon':
      return 'bg-amber-100 text-amber-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

export default function ManageStaff() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<StaffEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newTenth, setNewTenth] = useState('');
  const [newTwelfth, setNewTwelfth] = useState('');
  const [newDegree, setNewDegree] = useState('');
  const [newBankName, setNewBankName] = useState('');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [newIfsc, setNewIfsc] = useState('');
  const [newUpiId, setNewUpiId] = useState('');
  const [newDateOfJoining, setNewDateOfJoining] = useState('');
  const [newSalary, setNewSalary] = useState('');
  const [newSalaryDueDate, setNewSalaryDueDate] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        let snapshot;
        try {
          snapshot = await getDocs(query(collection(db, 'staff'), orderBy('createdAt', 'desc')));
        } catch {
          snapshot = await getDocs(collection(db, 'staff'));
        }
        const list = snapshot.docs.map((docItem) => ({ id: docItem.id, ...(docItem.data() as any) })) as StaffEntry[];
        setStaff(list);
      } catch (error) {
        console.error('Error fetching staff allowlist:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStaff();
  }, []);

  const handleAdd = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const normalizedEmail = newEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      toast.error('Enter staff email');
      return;
    }

    setIsAdding(true);
    try {
      const id = encodeId(normalizedEmail);
      const salaryValue = newSalary ? parseFloat(newSalary) : null;
      await setDoc(doc(db, 'staff', id), {
        email: normalizedEmail,
        name: newName.trim(),
        phone: newPhone.trim(),
        address: newAddress.trim(),
        tenth: newTenth.trim(),
        twelfth: newTwelfth.trim(),
        degree: newDegree.trim(),
        bankName: newBankName.trim(),
        accountNumber: newAccountNumber.trim(),
        ifsc: newIfsc.trim(),
        upiId: newUpiId.trim(),
        dateOfJoining: newDateOfJoining || null,
        salary: salaryValue,
        salaryDueDate: newSalaryDueDate || null,
        salaryPaid: false,
        lastSalarySentAt: null,
        addedBy: user?.email || 'unknown',
        createdAt: new Date().toISOString(),
        role: 'staff'
      });

      const usersQuery = query(collection(db, 'users'), where('email', '==', normalizedEmail));
      const usersSnap = await getDocs(usersQuery);
      if (!usersSnap.empty) {
        const u = usersSnap.docs[0];
        await setDoc(doc(db, 'users', u.id), { role: 'staff' }, { merge: true });
        toast.success('Staff added and user promoted');
      } else {
        toast.success('Staff allow-listed — will apply on first sign-in');
      }

      setStaff([
        {
          id,
          email: normalizedEmail,
          name: newName.trim(),
          phone: newPhone.trim(),
          address: newAddress.trim(),
          tenth: newTenth.trim(),
          twelfth: newTwelfth.trim(),
          degree: newDegree.trim(),
          bankName: newBankName.trim(),
          accountNumber: newAccountNumber.trim(),
          ifsc: newIfsc.trim(),
          upiId: newUpiId.trim(),
          dateOfJoining: newDateOfJoining || undefined,
          salary: salaryValue || undefined,
          salaryDueDate: newSalaryDueDate || undefined,
          salaryPaid: false,
          addedBy: user?.email || 'unknown',
          createdAt: new Date().toISOString()
        },
        ...staff
      ]);

      await logAdminActivity(
        user?.email,
        'CREATED',
        `Staff: ${newName.trim() || normalizedEmail}`,
        `Allow-listed staff member with salary ₹${salaryValue || 0}`
      );

      setNewEmail('');
      setNewName('');
      setNewPhone('');
      setNewAddress('');
      setNewTenth('');
      setNewTwelfth('');
      setNewDegree('');
      setNewBankName('');
      setNewAccountNumber('');
      setNewIfsc('');
      setNewUpiId('');
      setNewDateOfJoining('');
      setNewSalary('');
      setNewSalaryDueDate('');
    } catch (error) {
      console.error('Error adding staff:', error);
      toast.error('Failed to add staff');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (id: string, email: string) => {
    const confirm = window.confirm(`Remove ${email} from staff allow-list?`);
    if (!confirm) return;
    try {
      await deleteDoc(doc(db, 'staff', id));
      const usersQuery = query(collection(db, 'users'), where('email', '==', email));
      const usersSnap = await getDocs(usersQuery);
      if (!usersSnap.empty) {
        const u = usersSnap.docs[0];
        await setDoc(doc(db, 'users', u.id), { role: 'student' }, { merge: true });
      }
      setStaff(staff.filter((s) => s.id !== id));
      toast.success('Staff removed');
      await logAdminActivity(
        user?.email,
        'DELETED',
        `Staff: ${email}`,
        'Removed from staff allow-list'
      );
    } catch (error) {
      console.error('Error removing staff:', error);
      toast.error('Failed to remove staff');
    }
  };

  const handleMarkSalarySent = async (entry: StaffEntry) => {
    if (!entry.salaryDueDate) {
      toast.error('Salary due date is not set');
      return;
    }
    try {
      const now = new Date().toISOString();
      await setDoc(
        doc(db, 'staff', entry.id),
        {
          salaryPaid: true,
          lastSalarySentAt: now
        },
        { merge: true }
      );
      setStaff(
        staff.map((s) =>
          s.id === entry.id
            ? { ...s, salaryPaid: true, lastSalarySentAt: now }
            : s
        )
      );
      toast.success('Salary marked as sent');
      await logAdminActivity(
        user?.email,
        'STATUS_CHANGE',
        `Staff Payout: ${entry.name || entry.email}`,
        `Marked salary of ₹${entry.salary || 0} as paid`
      );
    } catch (error) {
      console.error('Error updating salary status:', error);
      toast.error('Failed to update salary status');
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-indigo-600" />
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Toaster position="top-center" />
      <div className="mb-8 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
          <Users size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold">Manage Staff</h1>
          <p className="text-slate-500">Add staff details and track salary payments from one place.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 mb-10">
        <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><UserPlus size={18} /> Add Staff</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Email</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                placeholder="staff@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Full Name</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 bg-slate-50"
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Phone</label>
              <input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 bg-slate-50"
                placeholder="Mobile number"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Address</label>
              <textarea
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 bg-slate-50 resize-none"
                placeholder="Residential address"
                rows={3}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold mb-1">10th Qualification</label>
                <input
                  value={newTenth}
                  onChange={(e) => setNewTenth(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 bg-slate-50"
                  placeholder="Board / Grade"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">12th Qualification</label>
                <input
                  value={newTwelfth}
                  onChange={(e) => setNewTwelfth(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 bg-slate-50"
                  placeholder="Board / Grade"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Degree</label>
              <input
                value={newDegree}
                onChange={(e) => setNewDegree(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 bg-slate-50"
                placeholder="Degree / Course"
              />
            </div>
            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><Banknote size={16} /> Bank / UPI Info</h3>
              <div className="grid gap-4">
                <input
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 bg-slate-50"
                  placeholder="Bank name"
                />
                <input
                  value={newAccountNumber}
                  onChange={(e) => setNewAccountNumber(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 bg-slate-50"
                  placeholder="Account number"
                />
                <input
                  value={newIfsc}
                  onChange={(e) => setNewIfsc(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 bg-slate-50"
                  placeholder="IFSC code"
                />
                <input
                  value={newUpiId}
                  onChange={(e) => setNewUpiId(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 bg-slate-50"
                  placeholder="UPI ID"
                />
              </div>
            </div>
            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><CalendarDays size={16} /> Employment</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold mb-1">Date of Joining</label>
                  <input
                    value={newDateOfJoining}
                    onChange={(e) => setNewDateOfJoining(e.target.value)}
                    type="date"
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Salary</label>
                  <input
                    value={newSalary}
                    onChange={(e) => setNewSalary(e.target.value)}
                    type="number"
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 bg-slate-50"
                    placeholder="Monthly salary"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-semibold mb-1">Salary Due Date</label>
                <input
                  value={newSalaryDueDate}
                  onChange={(e) => setNewSalaryDueDate(e.target.value)}
                  type="date"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 bg-slate-50"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isAdding}
              className="w-full rounded-2xl bg-indigo-600 text-white py-3 font-bold hover:bg-indigo-700 transition-colors disabled:opacity-70"
            >
              {isAdding ? 'Adding...' : 'Add to Allow-list'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-bold text-slate-900">Allow-listed Staff</h2>
                <p className="text-sm text-slate-500">Manage existing staff profiles and salary records.</p>
              </div>
              <span className="text-sm font-semibold text-slate-600">{staff.length} entries</span>
            </div>
            <div className="divide-y divide-slate-100">
              {staff.map((entry) => {
                const status = getSalaryStatus(entry);
                const dueNow = status === 'Due Now';

                return (
                  <div key={entry.id} className={`px-6 py-6 ${dueNow ? 'bg-rose-50' : ''}`}>
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-3 items-center">
                          <p className="font-bold text-slate-900">{entry.email}</p>
                          {entry.name && <span className="text-sm text-slate-500">{entry.name}</span>}
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClasses(status)}`}>{status}</span>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="rounded-3xl bg-slate-50 p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Contact</p>
                            <p className="text-sm text-slate-700">{entry.phone || '—'}</p>
                            <p className="text-sm text-slate-700">{entry.address || '—'}</p>
                          </div>
                          <div className="rounded-3xl bg-slate-50 p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Education</p>
                            <p className="text-sm text-slate-700">10th: {entry.tenth || '—'}</p>
                            <p className="text-sm text-slate-700">12th: {entry.twelfth || '—'}</p>
                            <p className="text-sm text-slate-700">Degree: {entry.degree || '—'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-3xl bg-slate-50 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">Bank / UPI</p>
                          <p className="text-sm text-slate-700">Bank: {entry.bankName || '—'}</p>
                          <p className="text-sm text-slate-700">A/C: {entry.accountNumber || '—'}</p>
                          <p className="text-sm text-slate-700">IFSC: {entry.ifsc || '—'}</p>
                          <p className="text-sm text-slate-700">UPI: {entry.upiId || '—'}</p>
                        </div>
                        <div className="rounded-3xl bg-slate-50 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">Employment</p>
                          <p className="text-sm text-slate-700">Joined: {formatDate(entry.dateOfJoining)}</p>
                          <p className="text-sm text-slate-700">Salary: {entry.salary != null ? `₹${entry.salary}` : '—'}</p>
                          <p className="text-sm text-slate-700">Due: {formatDate(entry.salaryDueDate)}</p>
                        </div>
                        <div className="rounded-3xl bg-slate-50 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">Payment</p>
                          <p className="text-sm text-slate-700">Status: {status}</p>
                          <p className="text-sm text-slate-700">Last Paid: {formatDate(entry.lastSalarySentAt)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3 items-center">
                      {!entry.salaryPaid && entry.salaryDueDate ? (
                        <button
                          onClick={() => handleMarkSalarySent(entry)}
                          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
                        >
                          <Wallet size={16} />
                          Mark Salary Sent
                        </button>
                      ) : null}
                      <button
                        onClick={() => handleRemove(entry.id, entry.email)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 px-5 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 size={16} />
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

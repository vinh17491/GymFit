import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Calendar, MapPin, Camera, Save, Award, Dumbbell, Clock } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import Input from '../../components/ui/input';
import Button from '../../components/ui/button';
import Badge from '../../components/ui/badge';
import StatCard from '../../components/shared/StatCard';
import toast from 'react-hot-toast';

export default function UserProfile() {
  const { user, setUser } = useAuthStore();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Profile updated (placeholder)');
    setUser({ ...user!, name: form.name, email: form.email, phone: form.phone });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="page-title mb-8">Profile</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Side info */}
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card p-6 text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-600 to-emerald-600 flex items-center justify-center text-3xl font-bold mx-auto mb-4">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <h2 className="text-xl font-bold">{user?.name}</h2>
            <p className="text-sm text-dark-400 capitalize">{user?.role}</p>
            <div className="mt-4 flex justify-center gap-2">
              <Badge variant="green">Active</Badge>
              {user?.role === 'admin' && <Badge variant="purple">Admin</Badge>}
            </div>
            <div className="mt-6 space-y-2 text-left text-sm text-dark-400">
              <div className="flex items-center gap-2"><Mail size={14} /> {user?.email}</div>
              {user?.phone && <div className="flex items-center gap-2"><Phone size={14} /> {user?.phone}</div>}
              {user?.referral_code && <div className="flex items-center gap-2"><Award size={14} /> Code: {user.referral_code}</div>}
            </div>
          </motion.div>
        </div>

        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-6">
            <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <Input label="Full Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} icon={<User size={16} />} />
              <Input label="Email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} icon={<Mail size={16} />} />
              <Input label="Phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} icon={<Phone size={16} />} />
              <Button type="submit" icon={<Save size={16} />}>Save Changes</Button>
            </form>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-6">
            <h3 className="text-lg font-semibold mb-4">Activity Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard title="Workouts" value={0} icon={<Dumbbell size={20} />} />
              <StatCard title="Hours" value={0} icon={<Clock size={20} />} />
              <StatCard title="Sessions" value={0} icon={<Calendar size={20} />} />
              <StatCard title="Streak" value={0} icon={<Award size={20} />} />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';
import { Dumbbell, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { canAccess,roleHome } from '../../auth/accessPolicy';
import { clearPendingPlan, getPendingPlanCheckoutPath } from '../../services/plans';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });
  
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();

  const validateEmail = (value: string) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(value);
  };

  const validatePassword = (value: string) => {
    return value.length >= 8;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    if (!validatePassword(password)) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    
    try {
      const current=await login(email,password);
      const pendingCheckout = current.role === 'member' ? getPendingPlanCheckoutPath() : null;
      if (current.role !== 'member') clearPendingPlan();
      const fromPath=typeof location.state?.from?.pathname==='string'?location.state.from.pathname:'';
      const fromSearch=typeof location.state?.from?.search==='string'?location.state.from.search:'';
      const destination=pendingCheckout || (fromPath&&fromPath.startsWith('/')&&canAccess(current.role,fromPath)?`${fromPath}${fromSearch}`:roleHome(current.role));
      navigate(destination,{replace:true});
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Login failed. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#020617] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-3 mb-6"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-[#22C55E] to-[#16A34A] rounded-xl flex items-center justify-center">
              <Dumbbell className="text-white" size={24} />
            </div>
            <span className="text-2xl font-bold text-white">GYMER</span>
          </motion.div>
          
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-[#94A3B8]">Sign in to your premium fitness account</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="bg-[#0f172a]/50 backdrop-blur-xl border border-[#334155] rounded-2xl p-8 shadow-2xl"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
                >
                  <AlertCircle className="text-red-400" size={20} />
                  <span className="text-red-400 text-sm">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-[#E2E8F0]">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="text-[#94A3B8]" size={20} />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setTouched({ ...touched, email: true })}
                  className="w-full pl-10 pr-4 py-3 bg-[#020617]/50 border border-[#334155] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#22C55E] focus:border-transparent transition-all duration-200"
                  placeholder="Enter your email"
                  required
                />
              </div>
              {touched.email && !validateEmail(email) && (
                <p className="text-red-400 text-sm">Please enter a valid email address</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-[#E2E8F0]">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="text-[#94A3B8]" size={20} />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-[#020617]/50 border border-[#334155] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#22C55E] focus:border-transparent transition-all duration-200"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#94A3B8] hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {touched.password && !validatePassword(password) && (
                <p className="text-red-400 text-sm">Password must be at least 8 characters</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 bg-[#020617] border-[#334155] rounded focus:ring-[#22C55E] focus:ring-2" />
                <span className="text-sm text-[#94A3B8]">Remember me</span>
              </label>
              <button type="button" className="text-sm text-[#22C55E] hover:text-[#16A34A] transition-colors">
                Forgot password?
              </button>
            </div>

            <motion.button
              type="submit"
              disabled={isLoading || !validateEmail(email) || !validatePassword(password)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 px-4 bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white font-semibold rounded-lg hover:from-[#16A34A] hover:to-[#15803D] transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>Sign In</>
              )}
            </motion.button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-[#94A3B8]">
              Don't have an account?{' '}
              <a href="/register" className="text-[#22C55E] hover:text-[#16A34A] font-medium">
                Sign up for free
              </a>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

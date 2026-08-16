import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';
import { Dumbbell, Mail, Lock, Eye, EyeOff, User, Phone, AlertCircle, CheckCircle } from 'lucide-react';
import { clearPendingPlan, getPendingPlanCheckoutPath } from '../../services/plans';
import { roleHome } from '../../auth/accessPolicy';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
    receiveUpdates: false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState({
    firstName: false, lastName: false, email: false, 
    phone: false, password: false, confirmPassword: false,
    agreeToTerms: false
  });

  const navigate = useNavigate();
  const location = useLocation();
  const register = useAuthStore(state => state.register);

  const validateEmail = (value: string) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(value);
  };

  const validatePhone = (value: string) => {
    const phoneRegex = /^\+?1?\d{9,15}$/;
    return phoneRegex.test(value.replace(/\s/g, ''));
  };

  const validatePassword = (value: string) => {
    return value.length >= 10 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value);
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
    return strength;
  };

  const getPasswordStrengthText = (strength: number) => {
    if (strength <= 2) return { text: 'Weak', color: 'text-red-400', bg: 'bg-red-500/20' };
    if (strength <= 4) return { text: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    return { text: 'Strong', color: 'text-green-400', bg: 'bg-green-500/20' };
  };

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleCheckboxChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setFormData(prev => ({ ...prev, [field]: checked }));
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate all fields
    if (!formData.firstName || !formData.lastName) {
      setError('Please enter your first and last name');
      return;
    }
    
    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    if (!validatePhone(formData.phone)) {
      setError('Please enter a valid phone number');
      return;
    }
    
    if (!validatePassword(formData.password)) {
      setError('Password must be 10–128 characters and include lowercase, uppercase, and a number');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (!formData.agreeToTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy');
      return;
    }

    setIsLoading(true);
    
    try {
      const current = await register({email:formData.email,password:formData.password,name:`${formData.firstName} ${formData.lastName}`.trim(),phone:formData.phone});
      const pendingCheckout = current.role === 'member' ? getPendingPlanCheckoutPath() : null;
      if (current.role !== 'member') clearPendingPlan();
      navigate(pendingCheckout || roleHome(current.role),{replace:true});
    } catch (err:unknown) {
      const response=(err as {response?:{data?:{message?:string}}}).response;
      setError(response?.data?.message||'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(formData.password);
  const passwordStrengthInfo = getPasswordStrengthText(passwordStrength);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#020617] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-2xl"
      >
        {/* Logo and Header */}
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
          
          <h1 className="text-3xl font-bold text-white mb-2">Create Your Account</h1>
          <p className="text-[#94A3B8]">Join thousands of members transforming their lives</p>
        </div>

        {/* Registration Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="bg-[#0f172a]/50 backdrop-blur-xl border border-[#334155] rounded-2xl p-8 shadow-2xl"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
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

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="firstName" className="block text-sm font-medium text-[#E2E8F0]">
                  First Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="text-[#94A3B8]" size={20} />
                  </div>
                  <input
                    id="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleInputChange('firstName')}
                    onFocus={() => setTouched({ ...touched, firstName: true })}
                    className="w-full pl-10 pr-4 py-3 bg-[#020617]/50 border border-[#334155] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#22C55E] focus:border-transparent transition-all duration-200"
                    placeholder="John"
                    required
                  />
                </div>
                {touched.firstName && !formData.firstName && (
                  <p className="text-red-400 text-sm">First name is required</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="lastName" className="block text-sm font-medium text-[#E2E8F0]">
                  Last Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="text-[#94A3B8]" size={20} />
                  </div>
                  <input
                    id="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleInputChange('lastName')}
                    onFocus={() => setTouched({ ...touched, lastName: true })}
                    className="w-full pl-10 pr-4 py-3 bg-[#020617]/50 border border-[#334155] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#22C55E] focus:border-transparent transition-all duration-200"
                    placeholder="Doe"
                    required
                  />
                </div>
                {touched.lastName && !formData.lastName && (
                  <p className="text-red-400 text-sm">Last name is required</p>
                )}
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-[#E2E8F0]">
                Email Address *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="text-[#94A3B8]" size={20} />
                </div>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange('email')}
                  onFocus={() => setTouched({ ...touched, email: true })}
                  className="w-full pl-10 pr-4 py-3 bg-[#020617]/50 border border-[#334155] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#22C55E] focus:border-transparent transition-all duration-200"
                  placeholder="john@example.com"
                  required
                />
              </div>
              {touched.email && !validateEmail(formData.email) && (
                <p className="text-red-400 text-sm">Please enter a valid email address</p>
              )}
            </div>

            {/* Phone Field */}
            <div className="space-y-2">
              <label htmlFor="phone" className="block text-sm font-medium text-[#E2E8F0]">
                Phone Number *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="text-[#94A3B8]" size={20} />
                </div>
                <input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange('phone')}
                  onFocus={() => setTouched({ ...touched, phone: true })}
                  className="w-full pl-10 pr-4 py-3 bg-[#020617]/50 border border-[#334155] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#22C55E] focus:border-transparent transition-all duration-200"
                  placeholder="+1 (555) 123-4567"
                  required
                />
              </div>
              {touched.phone && !validatePhone(formData.phone) && (
                <p className="text-red-400 text-sm">Please enter a valid phone number</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-[#E2E8F0]">
                Password *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="text-[#94A3B8]" size={20} />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  onFocus={() => setTouched({ ...touched, password: true })}
                  className="w-full pl-10 pr-12 py-3 bg-[#020617]/50 border border-[#334155] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#22C55E] focus:border-transparent transition-all duration-200"
                  placeholder="Create a strong password"
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
              <div className="flex items-center gap-2 mt-2">
                <div className={`h-1 flex-1 rounded-full transition-all ${passwordStrengthInfo.bg}`} style={{ width: `${(passwordStrength / 6) * 100}%` }} />
                <span className={`text-xs ${passwordStrengthInfo.color}`}>{passwordStrengthInfo.text}</span>
              </div>
              {touched.password && !validatePassword(formData.password) && (
                <p className="text-red-400 text-sm">Password must be 10–128 characters and include lowercase, uppercase, and a number</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#E2E8F0]">
                Confirm Password *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="text-[#94A3B8]" size={20} />
                </div>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleInputChange('confirmPassword')}
                  onFocus={() => setTouched({ ...touched, confirmPassword: true })}
                  className="w-full pl-10 pr-12 py-3 bg-[#020617]/50 border border-[#334155] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#22C55E] focus:border-transparent transition-all duration-200"
                  placeholder="Confirm your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#94A3B8] hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {touched.confirmPassword && formData.confirmPassword !== formData.password && (
                <p className="text-red-400 text-sm">Passwords do not match</p>
              )}
              {formData.confirmPassword && formData.password === formData.confirmPassword && (
                <p className="text-green-400 text-sm flex items-center gap-1">
                  <CheckCircle size={16} /> Passwords match
                </p>
              )}
            </div>

            {/* Checkboxes */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.agreeToTerms}
                  onChange={handleCheckboxChange('agreeToTerms')}
                  className="w-4 h-4 bg-[#020617] border-[#334155] rounded focus:ring-[#22C55E] focus:ring-2"
                />
                <span className="text-sm text-[#E2E8F0]">
                  I agree to the <Link to="/terms" className="text-[#22C55E] hover:text-[#16A34A]">Terms of Service</Link> and{' '}
                  <Link to="/privacy" className="text-[#22C55E] hover:text-[#16A34A]">Privacy Policy</Link>
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.receiveUpdates}
                  onChange={handleCheckboxChange('receiveUpdates')}
                  className="w-4 h-4 bg-[#020617] border-[#334155] rounded focus:ring-[#22C55E] focus:ring-2"
                />
                <span className="text-sm text-[#E2E8F0]">
                  Send me email updates about new workouts and features
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isLoading || !validateEmail(formData.email) || !validatePhone(formData.phone) || !validatePassword(formData.password) || formData.password !== formData.confirmPassword || !formData.agreeToTerms}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 px-4 bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white font-semibold rounded-lg hover:from-[#16A34A] hover:to-[#15803D] transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>Create Account</>
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="mt-6 mb-4 flex items-center">
            <div className="flex-1 border-t border-[#334155]" />
            <span className="px-4 text-sm text-[#94A3B8]">OR</span>
            <div className="flex-1 border-t border-[#334155]" />
          </div>

          {/* Social Login */}
          <motion.button
            disabled
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 px-4 bg-[#0f172a]/50 border border-[#334155] rounded-lg text-white font-medium hover:bg-[#1e293b] transition-all duration-200 flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75 0 4.27 2.73 7.9 6.5 9.26.475.09.65-.22.65-.49v-1.73c-2.64.57-3.2-1.27-3.2-1.27-.43-.99-1.05-.83-1.33-.8-.59.07-.9.43-.9.43.7.64 1.63 1.44 2.31 1.11.07-.86.35-1.44.63-1.77-.72-.09-1.4-.29-2.05-.57-.03-.27-.18-.64-.3-.87-.32-.45-.84-.31-.84.31.05.47.16.94.28 1.39.12.44.24.88.43 1.31.19.43.4.85.63 1.25.72.46 1.58.2 1.97-.3.39-.5.59-1.05.6-1.62.01-.32.02-.64.02-.95 0-.86-.03-1.72-.1-2.57-.07-.85-.04-1.73-.02-2.58.02-.35.03-.52.05-.52.43 0 .61.53.61.53.39 1.47 1.92 3.26 2.16 5.17.07.3.13.6.2.89.16.68.32 1.34.5 1.99.08.31.16.68.26.93.16.25.33.37.6.37.26-.01.49-.03.7-.05.21-.03.4-.08.6-.17.03-.01.06-.02.09-.04.32-.4.64-.81.97-1.24.33-.43.66-.87.97-1.34l.04-.08.02-.16.01-.27z"/>
              <path fill="#4285F4" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75 0 4.27 2.73 7.9 6.5 9.26.475.09.65-.22.65-.49v-1.73c-2.64.57-3.2-1.27-3.2-1.27-.43-.99-1.05-.83-1.33-.8-.59.07-.9.43-.9.43.7.64 1.63 1.44 2.31 1.11.07-.86.35-1.44.63-1.77-.72-.09-1.4-.29-2.05-.57-.03-.27-.18-.64-.3-.87-.32-.45-.84-.31-.84.31.05.47.16.94.28 1.39.12.44.24.88.43 1.31.19.43.4.85.63 1.25.72.46 1.58.2 1.97-.3.39-.5.59-1.05.6-1.62.01-.32.02-.64.02-.95 0-.86-.03-1.72-.1-2.57-.07-.85-.04-1.73-.02-2.58.02-.35.03-.52.05-.52.43 0 .61.53.61.53.39 1.47 1.92 3.26 2.16 5.17.07.3.13.6.2.89.16.68.32 1.34.5 1.99.08.31.16.68.26.93.16.25.33.37.6.37.26-.01.49-.03.7-.05.21-.03.4-.08.6-.17.03-.01.06-.02.09-.04.32-.4.64-.81.97-1.24.33-.43.66-.87.97-1.34l.04-.08.02-.16.01-.27z"/>
              <path fill="#FBBC05" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75 0 4.27 2.73 7.9 6.5 9.26.475.09.65-.22.65-.49v-1.73c-2.64.57-3.2-1.27-3.2-1.27-.43-.99-1.05-.83-1.33-.8-.59.07-.9.43-.9.43.7.64 1.63 1.44 2.31 1.11.07-.86.35-1.44.63-1.77-.72-.09-1.4-.29-2.05-.57-.03-.27-.18-.64-.3-.87-.32-.45-.84-.31-.84.31.05.47.16.94.28 1.39.12.44.24.88.43 1.31.19.43.4.85.63 1.25.72.46 1.58.2 1.97-.3.39-.5.59-1.05.6-1.62.01-.32.02-.64.02-.95 0-.86-.03-1.72-.1-2.57-.07-.85-.04-1.73-.02-2.58.02-.35.03-.52.05-.52.43 0 .61.53.61.53.39 1.47 1.92 3.26 2.16 5.17.07.3.13.6.2.89.16.68.32 1.34.5 1.99.08.31.16.68.26.93.16.25.33.37.6.37.26-.01.49-.03.7-.05.21-.03.4-.08.6-.17.03-.01.06-.02.09-.04.32-.4.64-.81.97-1.24.33-.43.66-.87.97-1.34l.04-.08.02-.16.01-.27z"/>
              <path fill="#34A853" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75 0 4.27 2.73 7.9 6.5 9.26.475.09.65-.22.65-.49v-1.73c-2.64.57-3.2-1.27-3.2-1.27-.43-.99-1.05-.83-1.33-.8-.59.07-.9.43-.9.43.7.64 1.63 1.44 2.31 1.11.07-.86.35-1.44.63-1.77-.72-.09-1.4-.29-2.05-.57-.03-.27-.18-.64-.3-.87-.32-.45-.84-.31-.84.31.05.47.16.94.28 1.39.12.44.24.88.43 1.31.19.43.4.85.63 1.25.72.46 1.58.2 1.97-.3.39-.5.59-1.05.6-1.62.01-.32.02-.64.02-.95 0-.86-.03-1.72-.1-2.57-.07-.85-.04-1.73-.02-2.58.02-.35.03-.52.05-.52.43 0 .61.53.61.53.39 1.47 1.92 3.26 2.16 5.17.07.3.13.6.2.89.16.68.32 1.34.5 1.99.08.31.16.68.26.93.16.25.33.37.6.37.26-.01.49-.03.7-.05.21-.03.4-.08.6-.17.03-.01.06-.02.09-.04.32-.4.64-.81.97-1.24.33-.43.66-.87.97-1.34l.04-.08.02-.16.01-.27z"/>
            </svg>
            Google sign-up is not configured
          </motion.button>

          {/* Divider */}
          <div className="mt-6 text-center">
            <p className="text-sm text-[#94A3B8]">
              Already have an account?{' '}
              <Link to="/login" className="text-[#22C55E] hover:text-[#16A34A] font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-[#64748B]">
            By creating an account, you agree to our{' '}
            <Link to="/terms" className="text-[#22C55E] hover:text-[#16A34A]">Terms of Service</Link>
            {' '}and{' '}
            <Link to="/privacy" className="text-[#22C55E] hover:text-[#16A34A]">Privacy Policy</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

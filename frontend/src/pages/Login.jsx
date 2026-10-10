import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, AlertCircle, Loader2, Factory } from 'lucide-react';
import { useAuth, getRoleLandingPath } from '../context/AuthContext';
import DemoAccountsHelper from '../components/DemoAccountsHelper';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, user, loading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Errors
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [bannerError, setBannerError] = useState('');
  const [sessionExpiredMsg, setSessionExpiredMsg] = useState(false);
  const [registerSuccessMsg, setRegisterSuccessMsg] = useState('');

  // Target destination after login
  const fromPath = location.state?.from?.pathname;

  useEffect(() => {
    // If user is already authenticated, redirect them to their landing page
    if (!authLoading && isAuthenticated && user) {
      const destination = fromPath || getRoleLandingPath(user.role);
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, user, authLoading, fromPath, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('expired') === 'true') {
      setSessionExpiredMsg(true);
    }
    if (location.state?.registeredMessage) {
      setRegisterSuccessMsg(location.state.registeredMessage);
    }
  }, [location]);

  const validate = () => {
    let valid = true;
    setEmailError('');
    setPasswordError('');
    setBannerError('');

    if (!email.trim()) {
      setEmailError('Email is required');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Please enter a valid email address');
      valid = false;
    }

    if (!password) {
      setPasswordError('Password is required');
      valid = false;
    }

    return valid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || submitting) return;

    setSubmitting(true);
    setBannerError('');
    setSessionExpiredMsg(false);

    try {
      const loggedUser = await login(email.trim(), password);
      const destination = fromPath || getRoleLandingPath(loggedUser.role);
      navigate(destination, { replace: true });
    } catch (err) {
      if (!err.response) {
        // Network error / server down
        setBannerError('Cannot reach the server. Is the backend running?');
      } else if (err.response.status === 401) {
        setBannerError(err.response.data?.detail || 'Invalid email or password');
      } else if (err.response.status === 403) {
        setBannerError(err.response.data?.detail || 'Account is disabled');
      } else if (err.response.status === 422) {
        setBannerError(err.response.data?.detail || 'Validation error');
      } else {
        setBannerError(err.response.data?.detail || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectDemoAccount = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setEmailError('');
    setPasswordError('');
    setBannerError('');
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col justify-center py-12 sm:px-6 lg:px-8 antialiased">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex justify-center items-center p-3.5 bg-[#142B4A] rounded-2xl shadow-xl shadow-slate-300/50 text-white border border-[#203B5D]">
          <Factory className="w-8 h-8 text-teal-400" />
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          Everest Textile Mills
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500 font-medium">
          Integrated Manufacturing Management System
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white border border-slate-200/90 py-8 px-6 shadow-xl shadow-slate-200/60 rounded-2xl sm:px-10">
          {sessionExpiredMsg && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Session expired. Please log in again to continue.</span>
            </div>
          )}

          {registerSuccessMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{registerSuccessMsg}</span>
            </div>
          )}

          {bannerError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{bannerError}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Email Address
              </label>
              <div className="mt-1.5 relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError('');
                  }}
                  className={`block w-full pl-9 pr-3 py-2.5 bg-white border rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm transition shadow-xs ${
                    emailError ? 'border-rose-400 ring-rose-300' : 'border-slate-300'
                  }`}
                  placeholder="name@everest.test"
                />
              </div>
              {emailError && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{emailError}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Password
              </label>
              <div className="mt-1.5 relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError('');
                  }}
                  className={`block w-full pl-9 pr-10 py-2.5 bg-white border rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm transition shadow-xs ${
                    passwordError ? 'border-rose-400 ring-rose-300' : 'border-slate-300'
                  }`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordError && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{passwordError}</p>
              )}
            </div>

            <button
              id="login-btn"
              type="submit"
              disabled={submitting}
              className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl shadow-md shadow-[#142B4A]/20 text-sm font-semibold text-white bg-[#142B4A] hover:bg-[#203B5D] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-3"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin text-teal-400" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
            <span>New Buyer Account?</span>
            <Link
              to="/register"
              className="font-semibold text-teal-700 hover:text-teal-800 underline transition"
            >
              Create Buyer Account
            </Link>
          </div>

          <DemoAccountsHelper onSelectAccount={handleSelectDemoAccount} />
        </div>
      </div>
    </div>
  );
}

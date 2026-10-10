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
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-sky-600 to-indigo-600 rounded-2xl shadow-xl shadow-sky-600/20 text-white">
            <Factory className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-white">
          Everest Textile Mills
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Manufacturing Management System Prototype
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          {sessionExpiredMsg && (
            <div className="mb-4 p-3 rounded-xl bg-amber-950/70 border border-amber-800 text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Session expired. Please log in again to continue.</span>
            </div>
          )}

          {registerSuccessMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{registerSuccessMsg}</span>
            </div>
          )}

          {bannerError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{bannerError}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div>
              <label className="block text-xs font-medium text-slate-300">
                Email Address
              </label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
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
                  className={`block w-full pl-9 pr-3 py-2.5 bg-slate-950 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm transition ${
                    emailError ? 'border-rose-500 ring-rose-500' : 'border-slate-800'
                  }`}
                  placeholder="name@everest.test"
                />
              </div>
              {emailError && (
                <p className="mt-1 text-xs text-rose-400">{emailError}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">
                Password
              </label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
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
                  className={`block w-full pl-9 pr-10 py-2.5 bg-slate-950 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm transition ${
                    passwordError ? 'border-rose-500 ring-rose-500' : 'border-slate-800'
                  }`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordError && (
                <p className="mt-1 text-xs text-rose-400">{passwordError}</p>
              )}
            </div>

            <button
              id="login-btn"
              type="submit"
              disabled={submitting}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl shadow-lg shadow-sky-600/25 text-sm font-medium text-white bg-sky-600 hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition mt-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
            <span>New Buyer?</span>
            <Link
              to="/register"
              className="font-medium text-sky-400 hover:text-sky-300 underline transition"
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

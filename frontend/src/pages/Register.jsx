import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, User, AlertCircle, Loader2, Factory, CheckCircle2 } from 'lucide-react';
import api from '../api/client';

export default function Register() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Validation errors
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [bannerError, setBannerError] = useState('');

  const validate = () => {
    let valid = true;
    setNameError('');
    setEmailError('');
    setPasswordError('');
    setConfirmError('');
    setBannerError('');

    if (!fullName.trim()) {
      setNameError('Full name is required');
      valid = false;
    }

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
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      valid = false;
    }

    if (password !== confirmPassword) {
      setConfirmError('Passwords do not match');
      valid = false;
    }

    return valid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || submitting) return;

    setSubmitting(true);
    setBannerError('');

    try {
      await api.post('/auth/register', {
        full_name: fullName.trim(),
        email: email.trim(),
        password: password,
      });

      // Redirect to login with success message
      navigate('/login', {
        state: { registeredMessage: 'Registration successful! You can now log in with your credentials.' },
        replace: true,
      });
    } catch (err) {
      if (!err.response) {
        setBannerError('Cannot reach the server. Is the backend running?');
      } else {
        setBannerError(err.response.data?.detail || 'Registration failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col justify-center py-12 sm:px-6 lg:px-8 antialiased">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex justify-center items-center p-3.5 bg-[#142B4A] rounded-2xl shadow-xl shadow-slate-300/50 text-white border border-[#203B5D]">
          <Factory className="w-8 h-8 text-teal-400" />
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          Buyer Registration
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500 font-medium">
          Create an account to track fabric orders with Everest Textile Mills
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white border border-slate-200/90 py-8 px-6 shadow-xl shadow-slate-200/60 rounded-2xl sm:px-10">
          {bannerError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{bannerError}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Full Name / Company Representative
              </label>
              <div className="mt-1.5 relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="reg-fullname"
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (nameError) setNameError('');
                  }}
                  className={`block w-full pl-9 pr-3 py-2.5 bg-white border rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm transition shadow-xs ${
                    nameError ? 'border-rose-400 ring-rose-300' : 'border-slate-300'
                  }`}
                  placeholder="e.g. John Doe (Apex Garments)"
                />
              </div>
              {nameError && <p className="mt-1 text-xs text-rose-600 font-medium">{nameError}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Email Address
              </label>
              <div className="mt-1.5 relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError('');
                  }}
                  className={`block w-full pl-9 pr-3 py-2.5 bg-white border rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm transition shadow-xs ${
                    emailError ? 'border-rose-400 ring-rose-300' : 'border-slate-300'
                  }`}
                  placeholder="buyer@domain.com"
                />
              </div>
              {emailError && <p className="mt-1 text-xs text-rose-600 font-medium">{emailError}</p>}
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
                  id="reg-password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError('');
                  }}
                  className={`block w-full pl-9 pr-3 py-2.5 bg-white border rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm transition shadow-xs ${
                    passwordError ? 'border-rose-400 ring-rose-300' : 'border-slate-300'
                  }`}
                  placeholder="Minimum 6 characters"
                />
              </div>
              {passwordError && <p className="mt-1 text-xs text-rose-600 font-medium">{passwordError}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Confirm Password
              </label>
              <div className="mt-1.5 relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="reg-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (confirmError) setConfirmError('');
                  }}
                  className={`block w-full pl-9 pr-3 py-2.5 bg-white border rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm transition shadow-xs ${
                    confirmError ? 'border-rose-400 ring-rose-300' : 'border-slate-300'
                  }`}
                  placeholder="Re-enter password"
                />
              </div>
              {confirmError && <p className="mt-1 text-xs text-rose-600 font-medium">{confirmError}</p>}
            </div>

            <button
              id="register-btn"
              type="submit"
              disabled={submitting}
              className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl shadow-md shadow-[#142B4A]/20 text-sm font-semibold text-white bg-[#142B4A] hover:bg-[#203B5D] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-3"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin text-teal-400" />
                  Creating Account...
                </>
              ) : (
                'Create Buyer Account'
              )}
            </button>
          </form>

          <div className="mt-4 text-center text-xs text-slate-500 border-t border-slate-100 pt-3">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-teal-700 hover:text-teal-800 underline transition">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

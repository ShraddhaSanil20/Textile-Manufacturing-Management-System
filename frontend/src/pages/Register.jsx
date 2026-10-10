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
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-sky-600 to-indigo-600 rounded-2xl shadow-xl shadow-sky-600/20 text-white">
            <Factory className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-white">
          Buyer Registration
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Create an account to track fabric orders with Everest Textile Mills
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          {bannerError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{bannerError}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div>
              <label className="block text-xs font-medium text-slate-300">
                Full Name / Company Representative
              </label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
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
                  className={`block w-full pl-9 pr-3 py-2 bg-slate-950 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm transition ${
                    nameError ? 'border-rose-500 ring-rose-500' : 'border-slate-800'
                  }`}
                  placeholder="e.g. John Doe (Apex Garments)"
                />
              </div>
              {nameError && <p className="mt-1 text-xs text-rose-400">{nameError}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">
                Email Address
              </label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
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
                  className={`block w-full pl-9 pr-3 py-2 bg-slate-950 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm transition ${
                    emailError ? 'border-rose-500 ring-rose-500' : 'border-slate-800'
                  }`}
                  placeholder="buyer@domain.com"
                />
              </div>
              {emailError && <p className="mt-1 text-xs text-rose-400">{emailError}</p>}
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
                  id="reg-password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError('');
                  }}
                  className={`block w-full pl-9 pr-3 py-2 bg-slate-950 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm transition ${
                    passwordError ? 'border-rose-500 ring-rose-500' : 'border-slate-800'
                  }`}
                  placeholder="Minimum 6 characters"
                />
              </div>
              {passwordError && <p className="mt-1 text-xs text-rose-400">{passwordError}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300">
                Confirm Password
              </label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
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
                  className={`block w-full pl-9 pr-3 py-2 bg-slate-950 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm transition ${
                    confirmError ? 'border-rose-500 ring-rose-500' : 'border-slate-800'
                  }`}
                  placeholder="Re-enter password"
                />
              </div>
              {confirmError && <p className="mt-1 text-xs text-rose-400">{confirmError}</p>}
            </div>

            <button
              id="register-btn"
              type="submit"
              disabled={submitting}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl shadow-lg shadow-sky-600/25 text-sm font-medium text-white bg-sky-600 hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition mt-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Buyer Account'
              )}
            </button>
          </form>

          <div className="mt-4 text-center text-xs text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-sky-400 hover:text-sky-300 underline transition">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { ShieldCheck, Mail, Lock, User, UserCheck } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studentId, setStudentId] = useState('');
  const [gender, setGender] = useState('남');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!studentId || studentId.trim().length < 8) {
          throw new Error('올바른 학번(8자리 이상)을 입력해주세요.');
        }
        const { data, error: signUpError } = await api.auth.signUp(
          email,
          password,
          studentId,
          gender
        );
        if (signUpError) throw signUpError;
        alert('회원가입이 완료되었습니다! 자동으로 로그인됩니다.');
        
        // Fetch session
        const { data: userData } = await api.auth.getUser();
        if (userData?.user) {
          onLoginSuccess(userData.user);
        }
      } else {
        const { data, error: signInError } = await api.auth.signIn(email, password);
        if (signInError) throw signInError;
        
        // Fetch session
        const { data: userData } = await api.auth.getUser();
        if (userData?.user) {
          onLoginSuccess(userData.user);
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message || '오류가 발생했습니다. 입력 정보를 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 justify-center px-6 py-8 bg-theme-emulator text-theme-text-primary transition-colors duration-300">
      {/* Service Logo & Name */}
      <div className="flex flex-col items-center mb-6 mt-4">
        <div className="w-16 h-16 bg-gradient-to-tr from-[#003893] to-blue-500 rounded-2xl flex items-center justify-center shadow-glow-blue-strong mb-4">
          <span className="text-white text-3xl font-black tracking-wider">T</span>
        </div>
        <h1 className="text-2xl font-bold text-theme-text-primary tracking-tight flex items-center gap-1.5 transition-colors">
          <span>대진대 택시 타자</span>
          <span className="text-[9px] bg-theme-blue-light text-theme-blue border border-theme-blue/20 px-1.5 py-0.5 rounded font-black uppercase tracking-wide">
            Official
          </span>
        </h1>
        <p className="text-xs text-theme-text-secondary mt-1.5 font-medium transition-colors">대진대학교 학생을 위한 실시간 동승 정산 앱</p>
      </div>

      {/* Tabs */}
      <div className="flex border border-theme-border mb-6 bg-theme-panel p-1.5 rounded-2xl transition-colors">
        <button
          onClick={() => {
            setIsRegister(false);
            setError('');
          }}
          className={`flex-1 py-2.5 text-center text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${
            !isRegister
              ? 'bg-theme-input text-theme-text-primary shadow-sm border border-theme-border'
              : 'text-theme-text-muted hover:text-theme-text-secondary'
          }`}
          style={{ minHeight: '40px' }}
        >
          로그인
        </button>
        <button
          onClick={() => {
            setIsRegister(true);
            setError('');
          }}
          className={`flex-1 py-2.5 text-center text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer ${
            isRegister
              ? 'bg-theme-input text-theme-text-primary shadow-sm border border-theme-border'
              : 'text-theme-text-muted hover:text-theme-text-secondary'
          }`}
          style={{ minHeight: '40px' }}
        >
          회원가입
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-xs font-semibold shadow-inner transition-all">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-xs font-bold text-theme-text-secondary mb-2 ml-1 transition-colors">이메일</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-theme-text-muted">
              <Mail size={16} />
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="daejin@daejin.ac.kr"
              className="w-full pl-11 pr-4 py-3 bg-theme-input border border-theme-input-border rounded-2xl text-xs focus:outline-none focus:border-theme-input-focus focus:bg-theme-input focus:shadow-glow-blue text-theme-text-primary transition-all placeholder-theme-text-muted/60"
              style={{ minHeight: '46px' }}
              required
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-bold text-theme-text-secondary mb-2 ml-1 transition-colors">비밀번호</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-theme-text-muted">
              <Lock size={16} />
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6자리 이상 비밀번호 입력"
              className="w-full pl-11 pr-4 py-3 bg-theme-input border border-theme-input-border rounded-2xl text-xs focus:outline-none focus:border-theme-input-focus focus:bg-theme-input focus:shadow-glow-blue text-theme-text-primary transition-all placeholder-theme-text-muted/60"
              style={{ minHeight: '46px' }}
              required
            />
          </div>
        </div>

        {/* Custom fields for Register */}
        {isRegister && (
          <>
            {/* Student ID */}
            <div>
              <label className="block text-xs font-bold text-theme-text-secondary mb-2 ml-1 transition-colors">학번</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-theme-text-muted">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="20261234 (8자리 이상)"
                  maxLength={10}
                  className="w-full pl-11 pr-4 py-3 bg-theme-input border border-theme-input-border rounded-2xl text-xs focus:outline-none focus:border-theme-input-focus focus:bg-theme-input focus:shadow-glow-blue text-theme-text-primary transition-all placeholder-theme-text-muted/60"
                  style={{ minHeight: '46px' }}
                  required
                />
              </div>
            </div>

            {/* Gender selection */}
            <div>
              <label className="block text-xs font-bold text-theme-text-secondary mb-2 ml-1 transition-colors">성별</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setGender('남')}
                  className={`py-3 text-center text-xs font-bold rounded-2xl border transition-all cursor-pointer ${
                    gender === '남'
                      ? 'border-theme-input-focus bg-theme-blue-light text-theme-blue shadow-glow-blue'
                      : 'border-theme-input-border bg-theme-input text-theme-text-secondary hover:bg-theme-panel'
                  }`}
                  style={{ minHeight: '44px' }}
                >
                  남자
                </button>
                <button
                  type="button"
                  onClick={() => setGender('여')}
                  className={`py-3 text-center text-xs font-bold rounded-2xl border transition-all cursor-pointer ${
                    gender === '여'
                      ? 'border-theme-input-focus bg-theme-blue-light text-theme-blue shadow-glow-blue'
                      : 'border-theme-input-border bg-theme-input text-theme-text-secondary hover:bg-theme-panel'
                  }`}
                  style={{ minHeight: '44px' }}
                >
                  여자
                </button>
              </div>
            </div>
          </>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-6 py-3.5 bg-gradient-to-r from-[#003893] to-blue-600 hover:from-blue-700 hover:to-blue-500 text-white text-xs font-bold rounded-2xl transition-all shadow-glow-blue hover:shadow-glow-blue-strong active:scale-[0.98] disabled:bg-theme-input-border disabled:text-theme-text-muted disabled:scale-100 flex items-center justify-center gap-2 cursor-pointer"
          style={{ minHeight: '46px' }}
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          ) : isRegister ? (
            <>
              <UserCheck size={16} />
              가입하기
            </>
          ) : (
            <>
              <ShieldCheck size={16} />
              로그인하기
            </>
          )}
        </button>
      </form>

      {/* Info notice */}
      {isRegister && (
        <div className="mt-8 text-center text-[10px] text-theme-text-muted leading-relaxed px-4 transition-colors">
          대진대 학우분들의 안전한 택시 동승을 위해 학번 및 성별 정보를 안전하게 확인하며, 가짜 학번 입력 시 서비스 이용이 제한될 수 있습니다.
        </div>
      )}
    </div>
  );
}

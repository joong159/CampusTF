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
    <div className="flex flex-col flex-1 justify-center px-6 py-10 bg-white">
      {/* Service Logo & Name */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 bg-[#003893] rounded-2xl flex items-center justify-center shadow-lg mb-3">
          <span className="text-white text-3xl font-black">T</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">대진대 택시 타자</h1>
        <p className="text-sm text-gray-500 mt-1">대진대학교 학생을 위한 실시간 동승 정산 앱</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 bg-gray-50 p-1 rounded-xl">
        <button
          onClick={() => {
            setIsRegister(false);
            setError('');
          }}
          className={`flex-1 py-3 text-center text-sm font-semibold rounded-lg transition-all duration-200 ${
            !isRegister
              ? 'bg-white text-[#003893] shadow-sm'
              : 'text-gray-500 hover:text-gray-900'
          }`}
          style={{ minHeight: '48px' }}
        >
          로그인
        </button>
        <button
          onClick={() => {
            setIsRegister(true);
            setError('');
          }}
          className={`flex-1 py-3 text-center text-sm font-semibold rounded-lg transition-all duration-200 ${
            isRegister
              ? 'bg-white text-[#003893] shadow-sm'
              : 'text-gray-500 hover:text-gray-900'
          }`}
          style={{ minHeight: '48px' }}
        >
          회원가입
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">이메일</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
              <Mail size={18} />
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="daejin@daejin.ac.kr"
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#003893] focus:bg-white transition-all text-gray-900"
              style={{ minHeight: '48px' }}
              required
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">비밀번호</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
              <Lock size={18} />
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6자리 이상 비밀번호 입력"
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#003893] focus:bg-white transition-all text-gray-900"
              style={{ minHeight: '48px' }}
              required
            />
          </div>
        </div>

        {/* Custom fields for Register */}
        {isRegister && (
          <>
            {/* Student ID */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">학번</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                  <User size={18} />
                </span>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="20261234 (8자리 이상)"
                  maxLength={10}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#003893] focus:bg-white transition-all text-gray-900"
                  style={{ minHeight: '48px' }}
                  required
                />
              </div>
            </div>

            {/* Gender selection */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">성별</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setGender('남')}
                  className={`py-3 text-center text-sm font-semibold rounded-xl border transition-all ${
                    gender === '남'
                      ? 'border-[#003893] bg-[#EBF2FF] text-[#003893] font-bold'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                  style={{ minHeight: '48px' }}
                >
                  남자
                </button>
                <button
                  type="button"
                  onClick={() => setGender('여')}
                  className={`py-3 text-center text-sm font-semibold rounded-xl border transition-all ${
                    gender === '여'
                      ? 'border-[#003893] bg-[#EBF2FF] text-[#003893] font-bold'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                  style={{ minHeight: '48px' }}
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
          className="w-full mt-6 py-3.5 bg-[#003893] hover:bg-[#002a70] text-white text-sm font-bold rounded-xl transition-all shadow-md active:scale-[0.98] disabled:bg-gray-300 disabled:scale-100 flex items-center justify-center gap-2"
          style={{ minHeight: '48px' }}
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          ) : isRegister ? (
            <>
              <UserCheck size={18} />
              가입하기
            </>
          ) : (
            <>
              <ShieldCheck size={18} />
              로그인하기
            </>
          )}
        </button>
      </form>

      {/* Info notice */}
      {isRegister && (
        <div className="mt-8 text-center text-xs text-gray-400">
          대진대 학우분들의 안전한 택시 동승을 위해 학번 및 성별 정보를 안전하게 확인하며, 가짜 학번 입력 시 서비스 이용이 제한될 수 있습니다.
        </div>
      )}
    </div>
  );
}

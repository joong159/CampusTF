'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { ShieldCheck, Mail, Lock, User, UserCheck, Eye, EyeOff, GraduationCap } from 'lucide-react';

const SOCIAL_PROVIDERS = [
  {
    id: 'kakao',
    label: '카카오로 시작하기',
    bg: '#FEE500', color: '#191919',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path fillRule="evenodd" clipRule="evenodd"
          d="M9 1C4.582 1 1 3.79 1 7.25c0 2.19 1.376 4.115 3.45 5.238L3.62 15.5a.3.3 0 0 0 .437.336L8.1 13.46A9.6 9.6 0 0 0 9 13.5c4.418 0 8-2.79 8-6.25S13.418 1 9 1z"
          fill="#191919"/>
      </svg>
    ),
  },
  {
    id: 'google',
    label: '구글로 시작하기',
    bg: '#FFFFFF', color: '#374151',
    border: '1.5px solid #E5E7EB',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18">
        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
        <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
      </svg>
    ),
  },
  {
    id: 'naver',
    label: '네이버로 시작하기',
    bg: '#03C75A', color: '#FFFFFF',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M10.2 9.27L7.65 5.4H5.4v7.2h2.4V8.73l2.55 3.87H12.6V5.4H10.2v3.87z" fill="white"/>
      </svg>
    ),
  },
  {
    id: 'apple',
    label: 'Apple로 시작하기',
    bg: '#000000', color: '#FFFFFF',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M14.5 9.75c-.02-1.96 1.6-2.9 1.67-2.95-1.1-1.6-2.64-1.58-3.2-1.6-1.36-.14-2.66.8-3.35.8-.7 0-1.77-.78-2.92-.76C5.12 5.26 3.6 6.17 2.77 7.6c-1.68 2.9-.43 7.2 1.2 9.56.8 1.15 1.75 2.44 3 2.4 1.2-.05 1.66-.78 3.1-.78 1.45 0 1.87.78 3.13.76 1.3-.02 2.12-1.17 2.91-2.33.92-1.33 1.3-2.63 1.32-2.7-.03-.01-2.53-.97-2.55-3.86z" fill="white"/>
        <path d="M12.07 3.6c.66-.8 1.1-1.9.98-3-.95.04-2.1.63-2.78 1.42-.61.7-1.14 1.83-1 2.9 1.06.08 2.14-.54 2.8-1.32z" fill="white"/>
      </svg>
    ),
  },
];

export default function Login({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [university, setUniversity] = useState('');
  const [gender, setGender] = useState('남');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        if (!studentId || studentId.trim().length < 2) {
          throw new Error('닉네임을 2자 이상 입력해주세요.');
        }
        const { data, error: signUpError } = await api.auth.signUp(email, password, studentId, gender, university);
        if (signUpError) throw signUpError;
        alert('가입 완료! 자동으로 로그인됩니다.');
        const { data: userData } = await api.auth.getUser();
        if (userData?.user) onLoginSuccess(userData.user);
      } else {
        const { data, error: signInError } = await api.auth.signIn(email, password);
        if (signInError) throw signInError;
        const { data: userData } = await api.auth.getUser();
        if (userData?.user) onLoginSuccess(userData.user);
      }
    } catch (err) {
      setError(err.message || '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (providerId) => {
    if (providerId === 'kakao' || providerId === 'google') {
      setLoading(true);
      try {
        const { error } = await api.auth.signInWithOAuth(providerId);
        if (error && error.message !== 'mock_mode') throw error;
      } catch (err) {
        setError(err.message || '소셜 로그인 오류');
      } finally {
        setLoading(false);
      }
    } else {
      alert(`해당 로그인은 곧 출시됩니다! 🚀`);
    }
  };

  const inputStyle = {
    width: '100%', height: '50px',
    background: '#F9FAFB', border: '1.5px solid #E5E7EB',
    borderRadius: '12px', fontSize: '14px', color: '#111827',
    outline: 'none', transition: 'all 0.18s', boxSizing: 'border-box',
  };

  const onFocus = (e) => {
    e.target.style.borderColor = '#2563EB';
    e.target.style.background = '#FFF';
    e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)';
  };
  const onBlur = (e) => {
    e.target.style.borderColor = '#E5E7EB';
    e.target.style.background = '#F9FAFB';
    e.target.style.boxShadow = 'none';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(145deg, #1E3A8A 0%, #2563EB 60%, #3B82F6 100%)',
        padding: '44px 24px 40px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', position: 'relative', overflow: 'hidden', flexShrink: 0,
      }}>
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
        <div style={{ position: 'absolute', bottom: '0', left: '-30px', width: '110px', height: '110px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

        <div style={{
          width: '68px', height: '68px', background: '#FFF', borderRadius: '20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 12px 32px rgba(0,0,0,0.18)', marginBottom: '14px', position: 'relative', zIndex: 1,
        }}>
          <span style={{ color: '#1D4ED8', fontSize: '30px', fontWeight: '900', lineHeight: 1 }}>W</span>
        </div>
        <h1 style={{ color: '#FFF', fontSize: '22px', fontWeight: '900', margin: '0 0 4px', letterSpacing: '-0.5px', position: 'relative', zIndex: 1 }}>
          위티 <span style={{ fontWeight: '400', opacity: 0.7, fontSize: '16px' }}>WeTee</span>
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: '500', margin: 0, position: 'relative', zIndex: 1 }}>
          택시 동승 매칭 & 정산, 누구나
        </p>
      </div>

      {/* Form Card */}
      <div style={{
        flex: 1, background: '#FFF', borderRadius: '28px 28px 0 0',
        marginTop: '-16px', padding: '24px 22px 20px',
        overflowY: 'auto', display: 'flex', flexDirection: 'column',
      }}>

        {/* Tab */}
        <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: '14px', padding: '4px', marginBottom: '20px' }}>
          {['로그인', '회원가입'].map((tab, i) => {
            const active = (i === 0 && !isRegister) || (i === 1 && isRegister);
            return (
              <button key={tab} onClick={() => { setIsRegister(i === 1); setError(''); }}
                style={{
                  flex: 1, padding: '11px', border: 'none', cursor: 'pointer',
                  borderRadius: '10px', fontSize: '14px', fontWeight: '700',
                  background: active ? '#FFF' : 'transparent',
                  color: active ? '#111827' : '#9CA3AF',
                  boxShadow: active ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.2s',
                }}>
                {tab}
              </button>
            );
          })}
        </div>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '12px 14px', marginBottom: '14px', fontSize: '13px', fontWeight: '600', color: '#DC2626' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '7px' }}>이메일</label>
            <div style={{ position: 'relative' }}>
              <Mail size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="이메일 주소 입력"
                style={{ ...inputStyle, paddingLeft: '42px', paddingRight: '14px' }}
                onFocus={onFocus} onBlur={onBlur} required />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '7px' }}>비밀번호</label>
            <div style={{ position: 'relative' }}>
              <Lock size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="6자리 이상"
                style={{ ...inputStyle, paddingLeft: '42px', paddingRight: '44px' }}
                onFocus={onFocus} onBlur={onBlur} required />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0 }}>
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* Register only fields */}
          {isRegister && (
            <>
              {/* University */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '7px' }}>
                  학교 <span style={{ color: '#9CA3AF', fontWeight: '400' }}>(선택)</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <GraduationCap size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
                  <input type="text" value={university} onChange={e => setUniversity(e.target.value)}
                    placeholder="예: 대진대학교, 서울대학교, 없음..."
                    style={{ ...inputStyle, paddingLeft: '42px', paddingRight: '14px' }}
                    onFocus={onFocus} onBlur={onBlur} />
                </div>
              </div>

              {/* Nickname / Student ID */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '7px' }}>
                  닉네임 <span style={{ color: '#9CA3AF', fontWeight: '400' }}>(학생은 학번 입력 가능)</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
                  <input type="text" value={studentId} onChange={e => setStudentId(e.target.value)}
                    placeholder="예: 홍길동, 20261234"
                    maxLength={20}
                    style={{ ...inputStyle, paddingLeft: '42px', paddingRight: '14px' }}
                    onFocus={onFocus} onBlur={onBlur} required />
                </div>
              </div>

              {/* Gender */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '7px' }}>성별</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {[{ val: '남', label: '남자' }, { val: '여', label: '여자' }].map(({ val, label }) => (
                    <button key={val} type="button" onClick={() => setGender(val)}
                      style={{
                        height: '50px', border: '2px solid',
                        borderColor: gender === val ? '#2563EB' : '#E5E7EB',
                        background: gender === val ? '#EFF6FF' : '#F9FAFB',
                        color: gender === val ? '#2563EB' : '#6B7280',
                        borderRadius: '12px', fontSize: '14px', fontWeight: '700',
                        cursor: 'pointer', transition: 'all 0.18s',
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Submit */}
          <button type="submit" disabled={loading}
            style={{
              width: '100%', height: '52px',
              background: loading ? '#93C5FD' : '#2563EB',
              color: '#FFF', border: 'none', borderRadius: '14px',
              fontSize: '15px', fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              marginTop: '4px',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(37,99,235,0.3)',
              transition: 'all 0.18s',
            }}>
            {loading
              ? <span style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#FFF', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
              : isRegister
                ? <><UserCheck size={18} /> 가입하기</>
                : <><ShieldCheck size={18} /> 로그인하기</>}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0 16px' }}>
          <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }} />
          <span style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: '500', whiteSpace: 'nowrap' }}>또는 소셜 계정으로</span>
          <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }} />
        </div>

        {/* Social Login Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
          {SOCIAL_PROVIDERS.map(p => {
            const isAvailable = p.id === 'kakao' || p.id === 'google';
            return (
              <button key={p.id} type="button" onClick={() => handleSocialLogin(p.id)}
                disabled={loading}
                style={{
                  width: '100%', height: '46px',
                  background: p.bg, color: p.color,
                  border: p.border || 'none',
                  borderRadius: '12px', fontSize: '13px', fontWeight: '700',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '8px',
                  position: 'relative', transition: 'opacity 0.15s',
                  opacity: isAvailable ? 1 : 0.65,
                }}>
                {p.icon}
                {p.label}
                {!isAvailable && (
                  <span style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'rgba(0,0,0,0.12)', color: 'inherit',
                    fontSize: '9px', fontWeight: '800', padding: '2px 7px',
                    borderRadius: '20px', letterSpacing: '0.04em',
                  }}>
                    출시 예정
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <p style={{ textAlign: 'center', fontSize: '11px', color: '#9CA3AF', marginTop: '16px', lineHeight: '1.6' }}>
          가입 시 위티 <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>이용약관</span> 및 <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>개인정보처리방침</span>에 동의합니다.
        </p>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { api, isMock } from '@/lib/api';
import Login from '@/components/Login';
import Home from '@/components/Home';
import CreateRoom from '@/components/CreateRoom';
import ChatRoom from '@/components/ChatRoom';
import ApplicantManagement from '@/components/ApplicantManagement';
import { 
  Database, Landmark, PhoneCall, Smartphone, Sparkles, 
  Navigation, Wifi, Battery, Signal, Shield, Sun, Moon 
} from 'lucide-react';

export default function App() {
  const [view, setView] = useState('loading'); // loading, login, home, create, chat, manage
  const [user, setUser] = useState(null);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [statusTime, setStatusTime] = useState('09:41');
  const [theme, setTheme] = useState('light'); // light, dark

  // Live Clock for Smartphone Status Bar
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hrs = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      setStatusTime(`${hrs}:${mins}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 60000);
    return () => clearInterval(interval);
  }, []);

  // Load session on start
  useEffect(() => {
    async function loadSession() {
      try {
        const { data, error } = await api.auth.getUser();
        if (data?.user) {
          setUser(data.user);
          setView('home');
        } else {
          setView('login');
        }
      } catch (e) {
        setView('login');
      }
    }
    loadSession();
  }, []);

  const handleLoginSuccess = (sessionUser) => {
    setUser(sessionUser);
    setView('home');
  };

  const handleLogout = async () => {
    const confirmLogout = window.confirm('로그아웃 하시겠습니까?');
    if (!confirmLogout) return;

    await api.auth.signOut();
    setUser(null);
    setView('login');
  };

  const handleSelectRoom = (roomId) => {
    setActiveRoomId(roomId);
    setView('chat');
  };

  const handleRoomCreated = (roomId) => {
    setActiveRoomId(roomId);
    setView('chat');
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <div className="w-full min-h-screen mesh-bg flex items-center justify-center p-0 md:p-6 lg:p-10 font-sans relative overflow-hidden transition-colors duration-300" data-theme={theme}>
      
      {/* Decorative Floating Background Light Elements */}
      <div className="absolute top-1/4 left-1/10 w-96 h-96 bg-theme-blue/10 rounded-full blur-3xl animate-float pointer-events-none transition-colors duration-300"></div>
      <div className="absolute bottom-1/4 right-1/10 w-[500px] h-[500px] bg-theme-blue/5 rounded-full blur-3xl animate-float-delayed pointer-events-none transition-colors duration-300"></div>

      <div className="w-full max-w-6xl flex flex-col md:flex-row items-center justify-center gap-10 lg:gap-16 z-10 px-4 md:px-0">
        
        {/* LEFT PANE: Branding / Marketing Landing Page (Hidden on Mobile) */}
        <div className="hidden md:flex flex-col md:w-1/2 max-w-lg text-left space-y-8 animate-fade-in">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-theme-blue-light border border-theme-border text-theme-blue text-xs font-extrabold rounded-full shadow-sm transition-colors duration-300">
              <Sparkles size={14} className="text-theme-gold" />
              <span>대진대 전용 택시 팟 매칭 서비스</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-extrabold text-theme-text-primary leading-tight tracking-tight transition-colors duration-300">
              등하교 택시비,<br />
              <span className="bg-gradient-to-r from-theme-blue to-[#3b82f6] bg-clip-text text-transparent font-black">학우들과 1/N</span>으로<br />
              부담 없이 가볍게!
            </h1>
            <p className="text-theme-text-secondary text-sm leading-relaxed font-semibold transition-colors duration-300">
              <strong className="text-theme-text-primary">대진대 택시 타자</strong>는 대중교통 배차가 긴 아침 지각 위기 상황이나 비용 부담이 클 때,
              출발지가 같은 동승자를 실시간 매칭하고, 정산 계좌 연동 및 요금 분할 UI로 편안한 통학을 돕습니다.
            </p>
          </div>

          {/* Core Feature Grids */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-theme-panel backdrop-blur-md border border-theme-border p-5 rounded-2xl shadow-sm hover:border-theme-blue/30 transition-all duration-300 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-theme-blue-light flex items-center justify-center text-theme-blue transition-colors duration-300">
                <Navigation size={18} />
              </div>
              <h4 className="font-bold text-theme-text-primary text-sm transition-colors duration-300">경로 기반 팟 추천</h4>
              <p className="text-xs text-theme-text-muted leading-normal font-semibold transition-colors duration-300">
                대진대 정문, 대진대역, 포천터미널 등 목적지와 같은 방을 즉시 필터링해 줍니다.
              </p>
            </div>
            
            <div className="bg-theme-panel backdrop-blur-md border border-theme-border p-5 rounded-2xl shadow-sm hover:border-theme-blue/30 transition-all duration-300 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                <Smartphone size={18} />
              </div>
              <h4 className="font-bold text-theme-text-primary text-sm transition-colors duration-300">동성 동승 옵션</h4>
              <p className="text-xs text-theme-text-muted leading-normal font-semibold transition-colors duration-300">
                동성만 매칭 옵션을 지원하여 여학생 전용 / 남학생 전용으로 안전하게 탑승 가능합니다.
              </p>
            </div>

            <div className="bg-theme-panel backdrop-blur-md border border-theme-border p-5 rounded-2xl shadow-sm hover:border-theme-blue/30 transition-all duration-300 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Landmark size={18} />
              </div>
              <h4 className="font-bold text-theme-text-primary text-sm transition-colors duration-300">N분의 1 자동 정산</h4>
              <p className="text-xs text-theme-text-muted leading-normal font-semibold transition-colors duration-300">
                실제 요금만 입력하면 탑승 인원에 맞추어 1원 단위까지 정산액을 계산해 고지합니다.
              </p>
            </div>

            <div className="bg-theme-panel backdrop-blur-md border border-theme-border p-5 rounded-2xl shadow-sm hover:border-theme-blue/30 transition-all duration-300 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-[#f59e0b]/10 flex items-center justify-center text-theme-gold">
                <PhoneCall size={18} />
              </div>
              <h4 className="font-bold text-theme-text-primary text-sm transition-colors duration-300">수락 방식 관리 & 톡</h4>
              <p className="text-xs text-theme-text-muted leading-normal font-semibold transition-colors duration-300">
                방장 수락 완료 후 실시간 채팅방이 활성화되어 미인증 탑승자의 난입을 차단합니다.
              </p>
            </div>
          </div>

          <div className="pt-2 text-xs text-theme-text-secondary font-bold flex items-center gap-2.5 transition-colors duration-300">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span>웹/앱 반응형 하이브리드 UI: 현재 모바일 프리뷰 작동 중</span>
          </div>
        </div>

        {/* RIGHT PANE: Smartphone Emulator on PC, Full Screen on Mobile */}
        <div className="w-full max-w-[420px] h-screen md:h-[840px] bg-theme-emulator md:rounded-[50px] md:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)] md:border-[12px] md:border-theme-bezel flex flex-col relative overflow-hidden transition-all duration-300">
          
          {/* Simulated Smartphone Notch/Speaker (Visible on PC only) */}
          <div className="hidden md:block w-36 h-7 bg-theme-bezel absolute top-0 left-1/2 transform -translate-x-1/2 rounded-b-2xl z-50 transition-colors duration-300">
            <div className="w-12 h-1 bg-slate-800 rounded-full mx-auto mt-2"></div>
          </div>
          
          {/* HIGH-FIDELITY SMARTPHONE TOP STATUS BAR (Visible on Mobile & PC Emulator) */}
          <div className="h-11 bg-theme-emulator text-theme-text-primary flex items-center justify-between px-6 z-40 select-none text-xs font-bold shrink-0 pt-2 md:pt-4 md:h-14 transition-colors duration-300">
            <span>{statusTime}</span>
            <div className="flex items-center gap-2">
              <button 
                onClick={toggleTheme} 
                className="mr-1.5 text-theme-text-secondary hover:text-theme-blue active:scale-95 transition-all cursor-pointer p-1 rounded-md"
                title={theme === 'light' ? '다크 모드로 전환' : '라이트 모드로 전환'}
              >
                {theme === 'light' ? <Moon size={14} /> : <Sun size={14} className="text-theme-gold" />}
              </button>
              <Signal size={14} className="text-theme-text-primary transition-colors" />
              <Wifi size={14} className="text-theme-text-primary transition-colors" />
              <Battery size={16} className="text-theme-text-primary transition-colors" />
            </div>
          </div>
          
          {/* Demo Mode Banner (Sleek Toast Style) */}
          {isMock && view !== 'loading' && (
            <div className="bg-[#003893] text-white px-4 py-2.5 flex items-center justify-between text-xs z-35 font-bold shadow-md border-b border-white/5 transition-colors duration-300">
              <span className="flex items-center gap-1.5">
                <Database size={13} className="text-theme-gold animate-pulse" />
                <span>데모 테스트 중 (Supabase 미연결)</span>
              </span>
              <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded text-white/95 font-black uppercase tracking-wider">
                로컬 저장소
              </span>
            </div>
          )}

          {/* App View Area */}
          <div className="flex-1 flex flex-col overflow-y-auto bg-theme-emulator relative transition-colors duration-300">
            {view === 'loading' && (
              <div className="flex-grow flex flex-col items-center justify-center bg-theme-emulator transition-colors">
                <div className="w-16 h-16 bg-[#003893] dark:bg-[#3b82f6] rounded-2xl flex items-center justify-center shadow-glow-blue-strong animate-pulse mb-6">
                  <span className="text-white text-3xl font-black">T</span>
                </div>
                <span className="w-6 h-6 border-2 border-theme-blue border-t-transparent rounded-full animate-spin"></span>
              </div>
            )}

            {view === 'login' && (
              <div className="view-transition flex-1 flex flex-col">
                <Login onLoginSuccess={handleLoginSuccess} />
              </div>
            )}

            {view === 'home' && user && (
              <div className="view-transition flex-1 flex flex-col">
                <Home
                  user={user}
                  onSelectRoom={handleSelectRoom}
                  onCreateRoomClick={() => setView('create')}
                  onLogout={handleLogout}
                />
              </div>
            )}

            {view === 'create' && user && (
              <div className="view-transition flex-1 flex flex-col">
                <CreateRoom
                  user={user}
                  onBack={() => setView('home')}
                  onRoomCreated={handleRoomCreated}
                />
              </div>
            )}

            {view === 'manage' && user && activeRoomId && (
              <div className="view-transition flex-1 flex flex-col">
                <ApplicantManagement
                  user={user}
                  roomId={activeRoomId}
                  onBack={() => setView('home')}
                  onEnterChat={() => setView('chat')}
                />
              </div>
            )}

            {view === 'chat' && user && activeRoomId && (
              <div className="view-transition flex-1 flex flex-col">
                <ChatRoom
                  user={user}
                  roomId={activeRoomId}
                  onBack={() => setView('home')}
                  onGoToManage={() => setView('manage')}
                />
              </div>
            )}
          </div>

          {/* Bottom Home Indicator Bar (Simulating modern smartphone navigation) */}
          <div className="h-5 bg-theme-emulator w-full flex items-center justify-center shrink-0 pb-1 z-40 transition-colors">
            <div className="w-32 h-1 bg-theme-text-primary/10 rounded-full home-indicator-pulse"></div>
          </div>
        </div>

      </div>
    </div>
  );
}

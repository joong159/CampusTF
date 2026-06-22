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
  Navigation, Wifi, Battery, Signal, Shield 
} from 'lucide-react';

export default function App() {
  const [view, setView] = useState('loading'); // loading, login, home, create, chat, manage
  const [user, setUser] = useState(null);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [statusTime, setStatusTime] = useState('09:41');

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

  const handleSelectRoom = async (roomId) => {
    try {
      const rooms = await api.rooms.list();
      const room = rooms.find(r => r.id === roomId);
      if (!room) return;

      const isHost = room.created_by === user.id;
      
      // If host, they can go to manage applicants or go straight to chat
      if (isHost) {
        setActiveRoomId(roomId);
        // By default, go to Applicant management if recruiting
        if (room.status === 'recruiting') {
          setView('manage');
        } else {
          setView('chat');
        }
      } else {
        // If participant, check if accepted
        const acceptedUsers = room.accepted_user_ids || [];
        if (acceptedUsers.includes(user.id)) {
          setActiveRoomId(roomId);
          setView('chat');
        } else {
          // If pending or other
          const apps = await api.applicants.list(roomId);
          const myApp = apps.find(a => a.user_id === user.id);
          if (myApp) {
            if (myApp.status === 'pending') {
              alert('방장이 가입 신청을 검토 중입니다. 수락 시 채팅방에 입장하실 수 있습니다.');
            } else if (myApp.status === 'rejected') {
              alert('방장이 동승 신청을 거절하셨습니다.');
            }
          } else {
            alert('이 방의 참여자가 아닙니다. 참여 신청을 먼저 진행해 주세요.');
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRoomCreated = (roomId) => {
    setActiveRoomId(roomId);
    setView('chat');
  };

  return (
    <div className="w-full min-h-screen mesh-bg flex items-center justify-center p-0 md:p-6 lg:p-10 font-sans relative overflow-hidden">
      
      {/* Decorative Floating Background Light Elements */}
      <div className="absolute top-1/4 left-1/10 w-96 h-96 bg-[#003893]/15 rounded-full blur-3xl animate-float pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/10 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl animate-float-delayed pointer-events-none"></div>

      <div className="w-full max-w-6xl flex flex-col md:flex-row items-center justify-center gap-10 lg:gap-16 z-10 px-4 md:px-0">
        
        {/* LEFT PANE: Branding / Marketing Landing Page (Hidden on Mobile) */}
        <div className="hidden md:flex flex-col md:w-1/2 max-w-lg text-left space-y-8 animate-fade-in">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#003893]/10 border border-[#003893]/30 text-blue-400 text-xs font-bold rounded-full shadow-glow-blue">
              <Sparkles size={14} className="text-[#f59e0b]" />
              <span>대진대 전용 택시 팟 매칭 서비스</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-extrabold text-white leading-tight tracking-tight">
              등하교 택시비,<br />
              <span className="bg-gradient-to-r from-blue-400 to-[#f59e0b] bg-clip-text text-transparent">학우들과 1/N</span>으로<br />
              부담 없이 가볍게!
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed font-medium">
              <strong className="text-slate-200">대진대 택시 타자</strong>는 대중교통 배차가 긴 아침 지각 위기 상황이나 비용 부담이 클 때,
              출발지가 같은 동승자를 실시간 매칭하고, 정산 계좌 연동 및 요금 분할 UI로 편안한 통학을 돕습니다.
            </p>
          </div>

          {/* Core Feature Grids */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-panel p-5 rounded-2xl shadow-glow-blue hover:border-blue-500/30 transition-all duration-300 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Navigation size={18} />
              </div>
              <h4 className="font-bold text-slate-200 text-sm">경로 기반 팟 추천</h4>
              <p className="text-xs text-slate-400 leading-normal font-medium">
                대진대 정문, 대진대역, 포천터미널 등 목적지와 같은 방을 즉시 필터링해 줍니다.
              </p>
            </div>
            
            <div className="glass-panel p-5 rounded-2xl shadow-glow-blue hover:border-blue-500/30 transition-all duration-300 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                <Smartphone size={18} />
              </div>
              <h4 className="font-bold text-slate-200 text-sm">동성 동승 옵션</h4>
              <p className="text-xs text-slate-400 leading-normal font-medium">
                동성만 매칭 옵션을 지원하여 여학생 전용 / 남학생 전용으로 안전하게 탑승 가능합니다.
              </p>
            </div>

            <div className="glass-panel p-5 rounded-2xl shadow-glow-blue hover:border-blue-500/30 transition-all duration-300 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Landmark size={18} />
              </div>
              <h4 className="font-bold text-slate-200 text-sm">N분의 1 자동 정산</h4>
              <p className="text-xs text-slate-400 leading-normal font-medium">
                실제 요금만 입력하면 탑승 인원에 맞추어 1원 단위까지 정산액을 계산해 고지합니다.
              </p>
            </div>

            <div className="glass-panel p-5 rounded-2xl shadow-glow-blue hover:border-blue-500/30 transition-all duration-300 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                <PhoneCall size={18} />
              </div>
              <h4 className="font-bold text-slate-200 text-sm">수락 방식 관리 & 톡</h4>
              <p className="text-xs text-slate-400 leading-normal font-medium">
                방장 수락 완료 후 실시간 채팅방이 활성화되어 미인증 탑승자의 난입을 차단합니다.
              </p>
            </div>
          </div>

          <div className="pt-2 text-xs text-slate-400 font-semibold flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span>웹/앱 반응형 하이브리드 UI: 현재 모바일 프리뷰 작동 중</span>
          </div>
        </div>

        {/* RIGHT PANE: Smartphone Emulator on PC, Full Screen on Mobile */}
        <div className="w-full max-w-[420px] h-screen md:h-[840px] bg-slate-950 md:rounded-[50px] md:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] md:border-[12px] md:border-slate-900 flex flex-col relative overflow-hidden transform transition-all">
          
          {/* Simulated Smartphone Notch/Speaker (Visible on PC only) */}
          <div className="hidden md:block w-36 h-7 bg-slate-900 absolute top-0 left-1/2 transform -translate-x-1/2 rounded-b-2xl z-50">
            <div className="w-12 h-1 bg-slate-800 rounded-full mx-auto mt-2"></div>
          </div>
          
          {/* HIGH-FIDELITY SMARTPHONE TOP STATUS BAR (Visible on Mobile & PC Emulator) */}
          <div className="h-11 bg-slate-950 text-white flex items-center justify-between px-6 z-40 select-none text-xs font-semibold shrink-0 pt-2 md:pt-4 md:h-14">
            <span>{statusTime}</span>
            <div className="flex items-center gap-1.5">
              <Signal size={14} className="text-white" />
              <Wifi size={14} className="text-white" />
              <Battery size={16} className="text-white" />
            </div>
          </div>
          
          {/* Demo Mode Banner (Sleek Toast Style) */}
          {isMock && view !== 'loading' && (
            <div className="bg-[#003893]/90 backdrop-blur-md text-white px-4 py-2 flex items-center justify-between text-xs z-35 font-medium shadow-md border-b border-white/5">
              <span className="flex items-center gap-1.5">
                <Database size={13} className="text-amber-400 animate-pulse" />
                <span>데모 테스트 중 (Supabase 미연결)</span>
              </span>
              <span className="text-[10px] bg-white/15 px-2 py-0.5 rounded text-white/90 font-bold">
                로컬 저장소
              </span>
            </div>
          )}

          {/* App View Area */}
          <div className="flex-1 flex flex-col overflow-y-auto bg-slate-950 relative">
            {view === 'loading' && (
              <div className="flex-grow flex flex-col items-center justify-center bg-slate-950">
                <div className="w-16 h-16 bg-[#003893] rounded-2xl flex items-center justify-center shadow-glow-blue-strong animate-pulse mb-6">
                  <span className="text-white text-3xl font-black">T</span>
                </div>
                <span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
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
          <div className="h-5 bg-slate-950 w-full flex items-center justify-center shrink-0 pb-1 z-40">
            <div className="w-32 h-1 bg-white/20 rounded-full home-indicator-pulse"></div>
          </div>
        </div>

      </div>
    </div>
  );
}

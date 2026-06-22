'use client';

import { useState, useEffect } from 'react';
import { api, isMock } from '@/lib/api';
import Login from '@/components/Login';
import Home from '@/components/Home';
import CreateRoom from '@/components/CreateRoom';
import ChatRoom from '@/components/ChatRoom';
import ApplicantManagement from '@/components/ApplicantManagement';
import { Database, AlertCircle } from 'lucide-react';

export default function App() {
  const [view, setView] = useState('loading'); // loading, login, home, create, chat, manage
  const [user, setUser] = useState(null);
  const [activeRoomId, setActiveRoomId] = useState(null);

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
    <div className="w-full min-h-screen bg-gray-100 flex justify-center">
      {/* Mobile-sized Container */}
      <div className="w-full max-w-[480px] min-h-screen bg-white shadow-2xl flex flex-col relative overflow-hidden">
        {/* Mock Mode Notice Banner */}
        {isMock && view !== 'loading' && (
          <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between text-xs z-50 font-medium">
            <span className="flex items-center gap-1.5">
              <Database size={13} className="animate-pulse" />
              데모 테스트 중 (Supabase 미연결)
            </span>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded text-white/90">
              LocalStorage 작동
            </span>
          </div>
        )}

        {/* Screen Controller */}
        {view === 'loading' && (
          <div className="flex-1 flex flex-col items-center justify-center bg-white">
            <div className="w-12 h-12 bg-[#003893] rounded-2xl flex items-center justify-center shadow-md animate-pulse mb-3">
              <span className="text-white text-2xl font-black">T</span>
            </div>
            <span className="w-6 h-6 border-2 border-[#003893] border-t-transparent rounded-full animate-spin"></span>
          </div>
        )}

        {view === 'login' && (
          <Login onLoginSuccess={handleLoginSuccess} />
        )}

        {view === 'home' && user && (
          <Home
            user={user}
            onSelectRoom={handleSelectRoom}
            onCreateRoomClick={() => setView('create')}
            onLogout={handleLogout}
          />
        )}

        {view === 'create' && user && (
          <CreateRoom
            user={user}
            onBack={() => setView('home')}
            onRoomCreated={handleRoomCreated}
          />
        )}

        {view === 'manage' && user && activeRoomId && (
          <ApplicantManagement
            user={user}
            roomId={activeRoomId}
            onBack={() => setView('home')}
            onEnterChat={() => setView('chat')}
          />
        )}

        {view === 'chat' && user && activeRoomId && (
          <ChatRoom
            user={user}
            roomId={activeRoomId}
            onBack={() => setView('home')}
            onGoToManage={() => setView('manage')}
          />
        )}
      </div>
    </div>
  );
}

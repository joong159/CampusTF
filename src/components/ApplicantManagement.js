'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { ArrowLeft, User, Check, X, ShieldAlert, MessageCircle } from 'lucide-react';

export default function ApplicantManagement({ user, roomId, onBack, onEnterChat }) {
  const [room, setRoom] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const roomsList = await api.rooms.list();
      const currentRoom = roomsList.find(r => r.id === roomId);
      setRoom(currentRoom);

      if (currentRoom) {
        const apps = await api.applicants.list(roomId);
        setApplicants(apps);
      }
    } catch (e) {
      console.error('Error fetching applicants:', e);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchData();
    }, 0);
    const interval = setInterval(fetchData, 3000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [roomId, fetchData]);

  const handleStatusUpdate = async (applicantId, status) => {
    const actionLabel = status === 'accepted' ? '수락' : '거절';
    const confirmAction = window.confirm(`이 학생의 신청을 ${actionLabel}하시겠습니까?`);
    if (!confirmAction) return;

    try {
      const { error } = await api.applicants.updateStatus(applicantId, status);
      if (error) throw error;
      
      // If accepted, check if capacity is reached
      if (status === 'accepted') {
        const currentAcceptedCount = applicants.filter(a => a.status === 'accepted').length + 1; // including host
        if (room && currentAcceptedCount + 1 >= room.capacity) {
          // Auto close room if full
          await api.rooms.updateStatus(roomId, 'closed');
        }
      }
      
      alert(`${actionLabel} 처리되었습니다.`);
      fetchData();
    } catch (err) {
      alert(err.message || '상태 업데이트에 실패했습니다.');
    }
  };

  if (loading && !room) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center bg-theme-emulator py-20 transition-colors">
        <span className="w-8 h-8 border-2 border-theme-blue border-t-transparent rounded-full animate-spin mb-3"></span>
        <span className="text-xs text-theme-text-muted font-bold transition-colors">신청자 목록 로딩 중...</span>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center p-6 bg-theme-emulator text-center transition-colors">
        <ShieldAlert size={36} className="text-red-500 mb-2" />
        <p className="text-sm font-bold text-theme-text-secondary transition-colors">방 정보를 찾을 수 없습니다.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-theme-panel border border-theme-border rounded-xl text-xs font-bold text-theme-text-secondary cursor-pointer">
          홈으로 가기
        </button>
      </div>
    );
  }

  const acceptedCount = applicants.filter(a => a.status === 'accepted').length + 1; // plus host
  const pendingApps = applicants.filter(a => a.status === 'pending');
  const otherApps = applicants.filter(a => a.status !== 'pending');

  return (
    <div className="flex flex-col flex-1 bg-theme-emulator text-theme-text-primary transition-colors duration-300 pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-theme-header backdrop-blur-md border-b border-theme-header-border px-4 py-3 flex items-center justify-between z-10 shadow-sm transition-colors">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 bg-theme-panel border border-theme-border hover:bg-theme-panel/70 rounded-full flex items-center justify-center text-theme-text-secondary hover:text-theme-text-primary transition-colors cursor-pointer"
            style={{ minHeight: '36px', minWidth: '36px' }}
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-sm font-black text-theme-text-primary transition-colors">신청자 관리</h1>
        </div>
        
        {/* Go to Chat */}
        <button
          onClick={onEnterChat}
          className="px-3.5 py-1.5 bg-gradient-to-r from-[#003893] to-blue-600 hover:from-theme-blue hover:to-blue-500 text-white text-[10px] font-black rounded-xl flex items-center gap-1 transition-all shadow-sm cursor-pointer"
          style={{ minHeight: '34px' }}
        >
          <MessageCircle size={14} />
          채팅방
        </button>
      </header>

      {/* Room Brief Info */}
      <div className="bg-theme-panel p-4 border-b border-theme-border shadow-sm transition-colors duration-300">
        <span className="text-[10px] font-bold text-theme-text-muted tracking-wider uppercase block mb-1.5 transition-colors">내 모집 방 정보</span>
        <div className="flex items-center gap-2 mb-2 font-bold">
          <span className="text-xs font-black text-theme-text-primary truncate max-w-[150px] transition-colors">{room.departure}</span>
          <span className="text-[10px] text-theme-text-muted">➔</span>
          <span className="text-xs font-black text-theme-text-primary truncate max-w-[150px] transition-colors">{room.destination}</span>
        </div>
        <div className="flex justify-between items-center text-xs text-theme-text-secondary pt-1 transition-colors">
          <span>출발 시간: <strong>{new Date(room.departure_time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}</strong></span>
          <span className="font-bold">참여: <strong className="text-theme-blue">{acceptedCount} / {room.capacity}명</strong></span>
        </div>
      </div>

      {/* Main List */}
      <div className="p-4 space-y-5 bg-theme-emulator transition-colors">
        {/* 1. Pending Applicants */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-black text-theme-text-muted tracking-wider uppercase ml-1 transition-colors">⏳ 대기 중인 신청 ({pendingApps.length})</h3>
          
          {pendingApps.length === 0 ? (
            <div className="bg-theme-panel rounded-2xl p-6 text-center border border-theme-border transition-colors">
              <p className="text-xs text-theme-text-muted font-bold transition-colors">새로운 신청자가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApps.map((app) => (
                <div
                  key={app.id}
                  className="bg-theme-panel rounded-2xl p-4 border border-theme-border shadow-sm flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-theme-blue-light text-theme-blue rounded-full flex items-center justify-center font-bold transition-colors">
                      <User size={16} />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-theme-text-primary block transition-colors">학번: {app.user.student_id}</span>
                      <span className="text-xs text-theme-text-secondary font-semibold transition-colors">성별: {app.user.gender}학생</span>
                    </div>
                  </div>

                  {/* Accept / Reject Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStatusUpdate(app.id, 'rejected')}
                      className="w-9 h-9 bg-red-500/10 border border-red-500/15 hover:bg-red-500/20 text-red-500 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                      style={{ minHeight: '36px', minWidth: '36px' }}
                      title="거절"
                    >
                      <X size={16} />
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(app.id, 'accepted')}
                      className="w-9 h-9 bg-theme-blue-light border border-theme-blue/15 hover:bg-theme-blue/20 text-theme-blue rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                      style={{ minHeight: '36px', minWidth: '36px' }}
                      title="수락"
                    >
                      <Check size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. Processed Applicants */}
        {otherApps.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-[10px] font-black text-theme-text-muted tracking-wider uppercase ml-1 transition-colors">처리된 신청 ({otherApps.length})</h3>
            <div className="space-y-2">
              {otherApps.map((app) => (
                <div
                  key={app.id}
                  className="bg-theme-panel hover:bg-theme-panel/70 rounded-xl p-3 border border-theme-border flex items-center justify-between text-xs transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-theme-input border border-theme-input-border text-theme-text-muted rounded-full flex items-center justify-center font-bold">
                      <User size={14} />
                    </div>
                    <div>
                      <span className="font-bold text-theme-text-secondary transition-colors">학번: {app.user.student_id}</span>
                      <span className="text-theme-text-muted ml-2">({app.user.gender})</span>
                    </div>
                  </div>

                  <div>
                    {app.status === 'accepted' ? (
                      <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-md font-bold">수락됨</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-md font-bold">거절됨</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

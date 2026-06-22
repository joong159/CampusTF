'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { ArrowLeft, User, Check, X, ShieldAlert, MessageCircle } from 'lucide-react';

export default function ApplicantManagement({ user, roomId, onBack, onEnterChat }) {
  const [room, setRoom] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
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
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [roomId]);

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
      <div className="flex flex-col flex-1 items-center justify-center bg-white py-20">
        <span className="w-8 h-8 border-4 border-[#003893] border-t-transparent rounded-full animate-spin mb-2"></span>
        <span className="text-xs text-gray-400 font-semibold">신청자 목록 로딩 중...</span>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center p-6 bg-white text-center">
        <ShieldAlert size={40} className="text-red-500 mb-2" />
        <p className="text-sm font-bold text-gray-700">방 정보를 찾을 수 없습니다.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-gray-100 rounded-xl text-xs font-bold text-gray-600">
          홈으로 가기
        </button>
      </div>
    );
  }

  const acceptedCount = applicants.filter(a => a.status === 'accepted').length + 1; // plus host
  const pendingApps = applicants.filter(a => a.status === 'pending');
  const otherApps = applicants.filter(a => a.status !== 'pending');

  return (
    <div className="flex flex-col flex-1 bg-gray-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 hover:bg-gray-50 rounded-full flex items-center justify-center text-gray-700 transition-colors"
            style={{ minHeight: '48px', minWidth: '48px' }}
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-base font-bold text-gray-800">신청자 관리</h1>
        </div>
        
        {/* Go to Chat */}
        <button
          onClick={onEnterChat}
          className="px-3.5 py-1.5 bg-[#003893] hover:bg-[#002a70] text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-colors"
          style={{ minHeight: '36px' }}
        >
          <MessageCircle size={14} />
          채팅방
        </button>
      </header>

      {/* Room Brief Info */}
      <div className="bg-white p-4 border-b border-gray-100 shadow-sm">
        <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase block mb-1">내 모집 방 정보</span>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-bold text-gray-800">{room.departure}</span>
          <span className="text-xs text-gray-400">➔</span>
          <span className="text-sm font-bold text-gray-800">{room.destination}</span>
        </div>
        <div className="flex justify-between items-center text-xs text-gray-500 pt-1">
          <span>출발 시간: <strong>{new Date(room.departure_time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}</strong></span>
          <span className="font-bold text-gray-700">참여: {acceptedCount} / {room.capacity}명</span>
        </div>
      </div>

      {/* Main List */}
      <div className="p-4 space-y-5">
        {/* 1. Pending Applicants */}
        <div className="space-y-2">
          <h3 className="text-xs font-black text-gray-400 tracking-wider uppercase">⏳ 대기 중인 신청 ({pendingApps.length})</h3>
          
          {pendingApps.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-gray-100">
              <p className="text-xs text-gray-400 font-semibold">새로운 신청자가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApps.map((app) => (
                <div
                  key={app.id}
                  className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#EBF2FF] text-[#003893] rounded-full flex items-center justify-center font-bold">
                      <User size={18} />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-gray-800 block">학번: {app.user.student_id}</span>
                      <span className="text-xs text-gray-400 font-semibold">성별: {app.user.gender}학생</span>
                    </div>
                  </div>

                  {/* Accept / Reject Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStatusUpdate(app.id, 'rejected')}
                      className="w-10 h-10 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl flex items-center justify-center transition-colors"
                      style={{ minHeight: '40px', minWidth: '40px' }}
                      title="거절"
                    >
                      <X size={18} />
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(app.id, 'accepted')}
                      className="w-10 h-10 bg-[#EBF2FF] hover:bg-[#d0e0fc] text-[#003893] rounded-xl flex items-center justify-center transition-colors"
                      style={{ minHeight: '40px', minWidth: '40px' }}
                      title="수락"
                    >
                      <Check size={18} />
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
            <h3 className="text-xs font-black text-gray-400 tracking-wider uppercase">처리된 신청 ({otherApps.length})</h3>
            <div className="space-y-2">
              {otherApps.map((app) => (
                <div
                  key={app.id}
                  className="bg-white/70 rounded-xl p-3 border border-gray-100 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center font-bold">
                      <User size={14} />
                    </div>
                    <div>
                      <span className="font-bold text-gray-700">학번: {app.user.student_id}</span>
                      <span className="text-gray-400 ml-2">({app.user.gender})</span>
                    </div>
                  </div>

                  <div>
                    {app.status === 'accepted' ? (
                      <span className="px-2 py-1 bg-green-50 text-green-600 rounded-md font-bold">수락됨</span>
                    ) : (
                      <span className="px-2 py-1 bg-red-50 text-red-500 rounded-md font-bold">거절됨</span>
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

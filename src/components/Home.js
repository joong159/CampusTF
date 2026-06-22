'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { 
  Search, Plus, LogOut, Navigation, MapPin, 
  Clock, Users, ArrowRight, CheckCircle2, AlertCircle, MessageCircle, Settings
} from 'lucide-react';

export default function Home({ user, onSelectRoom, onCreateRoomClick, onLogout }) {
  const [rooms, setRooms] = useState([]);
  const [departure, setDeparture] = useState('');
  const [destination, setDestination] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Quick select locations
  const locations = ['대진대 정문', '대진대역 1번출구', '포천터미널', '의정부역'];

  const fetchRooms = async () => {
    setLoading(true);
    const data = await api.rooms.list();
    setRooms(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchRooms();
    // Refresh rooms periodically (simulated live sync)
    const interval = setInterval(fetchRooms, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 10000); // update every 10s
    return () => clearInterval(timer);
  }, []);

  const renderCountdownBadge = (timeStr, status) => {
    if (status !== 'recruiting') return null;
    
    const diffMs = new Date(timeStr) - currentTime;
    if (diffMs <= 0) {
      return (
        <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
          출발 경과
        </span>
      );
    }
    
    const diffMins = Math.floor(diffMs / 1000 / 60);
    if (diffMins < 1) {
      return (
        <span className="text-[10px] font-black text-white bg-red-500 px-2 py-0.5 rounded-md animate-pulse">
          ⏳ 곧 출발!
        </span>
      );
    }
    if (diffMins < 10) {
      return (
        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md animate-pulse border border-amber-200">
          ⏳ {diffMins}분 남음!
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold text-[#003893] bg-[#EBF2FF] px-2 py-0.5 rounded-md">
        {diffMins}분 남음
      </span>
    );
  };

  const handleApply = async (roomId, e) => {
    e.stopPropagation();
    
    // Check gender filter
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    
    if (room.gender_filter === 'same_gender' && room.host.gender !== user.user_metadata.gender) {
      alert(`이 방은 [동성끼리만(${room.host.gender}성)] 방이므로 참여할 수 없습니다.`);
      return;
    }

    const confirmJoin = window.confirm('이 택시 팟에 참여 신청하시겠습니까?');
    if (!confirmJoin) return;

    try {
      const { error } = await api.applicants.apply(roomId, user.id);
      if (error) throw error;
      alert('신청이 완료되었습니다! 방장의 수락을 기다려주세요.');
      fetchRooms();
    } catch (err) {
      alert(err.message || '신청에 실패했습니다.');
    }
  };

  // Helper: Format Time (e.g. 15:30)
  const formatTime = (timeStr) => {
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch (e) {
      return timeStr;
    }
  };

  // Helper: Get status label and colors
  const getStatusInfo = (status) => {
    switch (status) {
      case 'recruiting':
        return { label: '모집 중', bg: 'bg-[#EBF2FF] text-[#003893]', dot: 'bg-[#003893]' };
      case 'closed':
        return { label: '모집 마감', bg: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' };
      case 'riding':
        return { label: '탑승 중', bg: 'bg-amber-50 text-amber-600', dot: 'bg-amber-500' };
      case 'settlement':
        return { label: '정산 요청', bg: 'bg-green-50 text-green-600', dot: 'bg-green-500' };
      default:
        return { label: '대기', bg: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' };
    }
  };

  // Filtering Rooms based on user's route selection
  const filteredRooms = rooms.filter(room => {
    const depMatch = !departure || room.departure.toLowerCase().includes(departure.toLowerCase());
    const destMatch = !destination || room.destination.toLowerCase().includes(destination.toLowerCase());
    return depMatch && destMatch;
  });

  // "나와 딱 맞는 추천 팟" (Route matches exact selected inputs, is recruiting, and gender restrictions match)
  const recommendedRooms = rooms.filter(room => {
    if (room.status !== 'recruiting') return false;
    
    // Check gender compatibility
    if (room.gender_filter === 'same_gender' && room.host.gender !== user.user_metadata.gender) {
      return false;
    }
    
    // Check route match
    if (departure && destination) {
      return (
        room.departure.toLowerCase().includes(departure.toLowerCase()) &&
        room.destination.toLowerCase().includes(destination.toLowerCase())
      );
    }
    // If only one is selected
    if (departure) {
      return room.departure.toLowerCase().includes(departure.toLowerCase());
    }
    if (destination) {
      return room.destination.toLowerCase().includes(destination.toLowerCase());
    }
    
    return false;
  }).slice(0, 2); // Show top 2 recommendations

  return (
    <div className="flex flex-col flex-1 bg-gray-50 relative pb-24">
      {/* Top Header */}
      <header className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#003893] rounded-lg flex items-center justify-center">
            <span className="text-white text-md font-bold">T</span>
          </div>
          <div>
            <span className="text-xs text-gray-400 font-semibold block">대진대학교</span>
            <span className="text-sm font-bold text-gray-800">택시 타자</span>
          </div>
        </div>
        
        {/* User profile & Logout */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[11px] font-bold text-gray-500 block">{user.user_metadata.student_id}</span>
            <span className="text-xs font-semibold text-gray-400">
              {user.user_metadata.gender === '남' ? '남학생' : '여학생'}
            </span>
          </div>
          <button
            onClick={onLogout}
            className="w-10 h-10 bg-gray-50 hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-500 transition-colors"
            style={{ minHeight: '48px', minWidth: '48px' }}
            title="로그아웃"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="p-4 space-y-6">
        {/* 1. Route Filter Container */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 mb-1">
            <Navigation size={16} className="text-[#003893]" />
            어디로 이동하시나요?
          </h2>
          
          <div className="space-y-2">
            {/* Departure */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <MapPin size={16} className="text-blue-500" />
              </span>
              <input
                type="text"
                value={departure}
                onChange={(e) => setDeparture(e.target.value)}
                placeholder="출발지 (예: 대진대역)"
                className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#003893] text-gray-800"
                style={{ minHeight: '48px' }}
              />
            </div>
            
            {/* Destination */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <MapPin size={16} className="text-red-500" />
              </span>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="목적지 (예: 대진대 정문)"
                className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#003893] text-gray-800"
                style={{ minHeight: '48px' }}
              />
            </div>
          </div>

          {/* Quick Select Buttons */}
          <div className="pt-2">
            <span className="text-[11px] font-bold text-gray-400 block mb-1.5">자주 가는 추천 거점</span>
            <div className="flex flex-wrap gap-1.5">
              {locations.map((loc) => (
                <button
                  key={loc}
                  onClick={() => {
                    // Smart filling: if departure is empty, fill departure. Else fill destination
                    if (!departure) setDeparture(loc);
                    else if (!destination && departure !== loc) setDestination(loc);
                    else {
                      setDeparture(loc);
                      setDestination('');
                    }
                  }}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
                  style={{ minHeight: '36px' }}
                >
                  {loc}
                </button>
              ))}
              {(departure || destination) && (
                <button
                  onClick={() => {
                    setDeparture('');
                    setDestination('');
                  }}
                  className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-500 text-xs font-bold rounded-lg transition-colors"
                  style={{ minHeight: '36px' }}
                >
                  초기화
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 2. Recommended Pots ("나와 딱 맞는 추천 팟") */}
        {recommendedRooms.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-black text-gray-400 tracking-wider uppercase">✨ 나와 딱 맞는 추천 팟</h3>
            <div className="space-y-3">
              {recommendedRooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => onSelectRoom(room.id)}
                  className="bg-gradient-to-br from-[#003893]/5 to-[#003893]/10 border border-[#003893]/10 rounded-2xl p-4 shadow-sm relative overflow-hidden cursor-pointer hover:shadow transition-shadow"
                >
                  <div className="absolute top-0 right-0 bg-[#003893] text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">
                    추천 매칭
                  </div>
                  
                  {/* Route details */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-bold text-gray-800 max-w-[120px] truncate">{room.departure}</span>
                    <ArrowRight size={14} className="text-gray-400" />
                    <span className="text-sm font-bold text-gray-800 max-w-[120px] truncate">{room.destination}</span>
                  </div>

                  {/* Room Meta */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Clock size={14} className="text-gray-400" />
                        {formatTime(room.departure_time)} 출발
                      </span>
                      <span className="flex items-center gap-1 font-bold text-gray-700">
                        <Users size={14} className="text-gray-400" />
                        {room.participant_count} / {room.capacity}명
                      </span>
                    </div>
                    
                    {/* Action button inside card */}
                    <button
                      className="px-3.5 py-1.5 bg-[#003893] text-white text-xs font-bold rounded-lg hover:bg-[#002a70]"
                      style={{ minHeight: '36px' }}
                    >
                      상세 보기
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Overall Room List */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black text-gray-400 tracking-wider uppercase">🚗 실시간 모집 방 목록 ({filteredRooms.length})</h3>
            {filteredRooms.length > 0 && <span className="text-[10px] font-bold text-gray-400">출발 시간순 정렬</span>}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <span className="w-8 h-8 border-4 border-[#003893] border-t-transparent rounded-full animate-spin mb-2"></span>
              <span className="text-xs text-gray-400">방 목록을 불러오고 있어요...</span>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center flex flex-col items-center justify-center">
              <AlertCircle size={36} className="text-gray-300 mb-3" />
              <p className="text-sm font-bold text-gray-600">등록된 모집 방이 없습니다.</p>
              <p className="text-xs text-gray-400 mt-1">우측 하단의 [+] 버튼을 눌러 첫 방을 만들어보세요!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRooms.map((room) => {
                const statusInfo = getStatusInfo(room.status);
                const isHost = room.created_by === user.id;
                
                // Find if current user is an applicant
                const acceptedUsers = room.accepted_user_ids || [];
                const isAccepted = acceptedUsers.includes(user.id);
                
                return (
                  <div
                    key={room.id}
                    onClick={() => onSelectRoom(room.id)}
                    className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm cursor-pointer hover:border-gray-200 transition-all flex flex-col"
                  >
                    {/* Top Row: status & gender tags */}
                    <div className="flex items-center justify-between mb-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${statusInfo.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`}></span>
                          {statusInfo.label}
                        </span>
                        
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          room.gender_filter === 'same_gender'
                            ? 'bg-purple-50 text-purple-600 border border-purple-100'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {room.gender_filter === 'same_gender' ? `동성만 (${room.host.gender})` : '성별 무관'}
                        </span>

                        {renderCountdownBadge(room.departure_time, room.status)}
                      </div>
                      
                      {/* Host Student ID indicator */}
                      <span className="text-[10px] font-bold text-gray-400">
                        방장: {room.host.student_id} ({room.host.gender})
                      </span>
                    </div>

                    {/* Route Details */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-base font-bold text-gray-800 max-w-[150px] truncate">{room.departure}</span>
                      <ArrowRight size={14} className="text-gray-400" />
                      <span className="text-base font-bold text-gray-800 max-w-[150px] truncate">{room.destination}</span>
                    </div>

                    {/* Bottom Row: metadata & actionable states */}
                    <div className="flex items-end justify-between pt-3 border-t border-gray-100">
                      <div className="space-y-1 text-xs text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <Clock size={13} className="text-gray-400" />
                          <span>출발: <strong>{formatTime(room.departure_time)}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users size={13} className="text-gray-400" />
                          <span>참여: <strong className="text-[#003893]">{room.participant_count} / {room.capacity}명</strong></span>
                        </div>
                      </div>

                      {/* Room Action State Button */}
                      <div>
                        {isHost ? (
                          <div className="flex items-center gap-1 px-3.5 py-2 bg-[#EBF2FF] hover:bg-[#d0e0fc] text-[#003893] text-xs font-bold rounded-xl transition-colors">
                            <Settings size={14} />
                            신청자 관리
                          </div>
                        ) : isAccepted ? (
                          <div className="flex items-center gap-1 px-3.5 py-2 bg-green-50 hover:bg-green-100 text-green-600 text-xs font-bold rounded-xl transition-colors">
                            <MessageCircle size={14} />
                            채팅방 입장
                          </div>
                        ) : room.status === 'recruiting' ? (
                          <button
                            onClick={(e) => handleApply(room.id, e)}
                            className="px-4 py-2 bg-[#003893] hover:bg-[#002a70] text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                            style={{ minHeight: '40px' }}
                          >
                            참여 신청
                          </button>
                        ) : (
                          <button
                            disabled
                            className="px-3.5 py-2 bg-gray-100 text-gray-400 text-xs font-bold rounded-xl"
                          >
                            신청 불가
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button (FAB) for Creating Room */}
      <button
        onClick={onCreateRoomClick}
        className="fixed bottom-6 right-[calc(50%-210px)] max-[480px]:right-6 w-14 h-14 bg-[#003893] hover:bg-[#002a70] text-white rounded-full flex items-center justify-center shadow-2xl z-20 transition-all active:scale-[0.9] hover:scale-[1.05]"
        style={{ minHeight: '56px', minWidth: '56px' }}
        title="방 개설하기"
      >
        <Plus size={28} />
      </button>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const [currentTime, setCurrentTime] = useState(0);

  // Quick select locations
  const locations = ['대진대 정문', '대진대역 1번출구', '포천터미널', '의정부역'];

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    const data = await api.rooms.list();
    setRooms(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchRooms();
    }, 0);
    // Refresh rooms periodically (simulated live sync)
    const interval = setInterval(fetchRooms, 4000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [fetchRooms]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setCurrentTime(Date.now());
    }, 0);
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 10000); // update every 10s
    return () => {
      clearTimeout(timeout);
      clearInterval(timer);
    };
  }, []);

  const renderCountdownBadge = (timeStr, status) => {
    if (status !== 'recruiting') return null;
    
    const diffMs = new Date(timeStr) - currentTime;
    if (diffMs <= 0) {
      return (
        <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">
          출발 경과
        </span>
      );
    }
    
    const diffMins = Math.floor(diffMs / 1000 / 60);
    if (diffMins < 1) {
      return (
        <span className="text-[10px] font-black text-white bg-red-500 px-2 py-0.5 rounded-md animate-pulse shadow-sm">
          ⏳ 곧 출발!
        </span>
      );
    }
    if (diffMins < 10) {
      return (
        <span className="text-[10px] font-bold text-theme-gold bg-theme-gold/10 px-2 py-0.5 rounded-md animate-pulse border border-theme-gold/20">
          ⏳ {diffMins}분 남음!
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold text-theme-blue bg-theme-blue-light px-2 py-0.5 rounded-md border border-theme-blue/20">
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
        return { label: '모집 중', bg: 'bg-theme-blue-light text-theme-blue border border-theme-blue/20 shadow-sm', dot: 'bg-theme-blue' };
      case 'closed':
        return { label: '모집 마감', bg: 'bg-theme-panel text-theme-text-muted border border-theme-border', dot: 'bg-theme-text-muted' };
      case 'riding':
        return { label: '탑승 중', bg: 'bg-theme-gold/10 text-theme-gold border border-theme-gold/25', dot: 'bg-theme-gold' };
      case 'settlement':
        return { label: '정산 요청', bg: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/25', dot: 'bg-emerald-500' };
      default:
        return { label: '대기', bg: 'bg-theme-panel text-theme-text-muted border border-theme-border', dot: 'bg-theme-text-muted' };
    }
  };

  // Seat visual dots generator
  const renderSeats = (count, max) => {
    let dots = [];
    for (let i = 0; i < max; i++) {
      dots.push(
        <span
          key={i}
          className={`w-2 h-2 rounded-full inline-block mr-1 ${
            i < count 
              ? 'bg-theme-blue shadow-sm' 
              : 'bg-theme-input border border-theme-input-border'
          }`}
        />
      );
    }
    return <div className="flex items-center gap-0.5">{dots}</div>;
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
    <div className="flex flex-col flex-1 bg-theme-emulator text-theme-text-primary transition-colors duration-300 relative pb-24">
      {/* Top Header */}
      <header className="sticky top-0 bg-theme-header backdrop-blur-md border-b border-theme-header-border px-4 py-3 flex items-center justify-between z-10 shadow-sm transition-colors">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-tr from-[#003893] to-blue-500 rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white text-md font-extrabold tracking-wider">T</span>
          </div>
          <div>
            <span className="text-[10px] text-theme-text-muted font-bold block leading-none transition-colors">대진대학교</span>
            <span className="text-xs font-black text-theme-text-primary tracking-tight transition-colors">택시 타자</span>
          </div>
        </div>
        
        {/* User profile & Logout */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] font-bold text-theme-text-primary block transition-colors">{user.user_metadata.student_id}</span>
            <span className="text-[9px] font-bold text-theme-text-muted transition-colors">
              {user.user_metadata.gender === '남' ? '남학생' : '여학생'}
            </span>
          </div>
          <button
            onClick={onLogout}
            className="w-9 h-9 bg-theme-panel border border-theme-border hover:bg-theme-panel/70 rounded-full flex items-center justify-center text-theme-text-secondary hover:text-red-500 transition-colors cursor-pointer"
            style={{ minHeight: '36px', minWidth: '36px' }}
            title="로그아웃"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="p-4 space-y-6">
        {/* 1. Route Filter Container */}
        <div className="bg-theme-panel border border-theme-border rounded-3xl p-5 shadow-sm space-y-4 transition-colors">
          <h2 className="text-xs font-bold text-theme-text-primary flex items-center gap-2 mb-1 transition-colors">
            <Navigation size={16} className="text-theme-blue transition-colors" />
            어디로 이동하시나요?
          </h2>
          
          <div className="space-y-2.5">
            {/* Departure */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-theme-text-muted">
                <MapPin size={16} className="text-blue-500" />
              </span>
              <input
                type="text"
                value={departure}
                onChange={(e) => setDeparture(e.target.value)}
                placeholder="출발지 (예: 대진대역)"
                className="w-full pl-10 pr-4 py-3 bg-theme-input border border-theme-input-border rounded-2xl text-xs focus:outline-none focus:border-theme-input-focus text-theme-text-primary transition-all placeholder-theme-text-muted/65"
                style={{ minHeight: '44px' }}
              />
            </div>
            
            {/* Destination */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-theme-text-muted">
                <MapPin size={16} className="text-red-500" />
              </span>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="목적지 (예: 대진대 정문)"
                className="w-full pl-10 pr-4 py-3 bg-theme-input border border-theme-input-border rounded-2xl text-xs focus:outline-none focus:border-theme-input-focus text-theme-text-primary transition-all placeholder-theme-text-muted/65"
                style={{ minHeight: '44px' }}
              />
            </div>
          </div>

          {/* Quick Select Buttons */}
          <div className="pt-2">
            <span className="text-[10px] font-bold text-theme-text-muted block mb-2 tracking-wide uppercase transition-colors">자주 가는 추천 거점</span>
            <div className="flex flex-wrap gap-2">
              {locations.map((loc) => (
                <button
                  key={loc}
                  onClick={() => {
                    // Smart filling
                    if (!departure) setDeparture(loc);
                    else if (!destination && departure !== loc) setDestination(loc);
                    else {
                      setDeparture(loc);
                      setDestination('');
                    }
                  }}
                  className="px-3.5 py-2 bg-theme-input hover:bg-theme-panel text-theme-text-secondary text-xs font-semibold rounded-xl border border-theme-input-border transition-all cursor-pointer"
                  style={{ minHeight: '34px' }}
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
                  className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold rounded-xl border border-red-500/20 transition-all cursor-pointer"
                  style={{ minHeight: '34px' }}
                >
                  초기화
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 2. Recommended Pots ("나와 딱 맞는 추천 팟") */}
        {recommendedRooms.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-theme-text-muted tracking-wider uppercase ml-1 flex items-center gap-1 transition-colors">
              <span>✨ 나와 딱 맞는 추천 팟</span>
            </h3>
            <div className="space-y-3">
              {recommendedRooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => onSelectRoom(room.id)}
                  className="bg-gradient-to-br from-theme-blue/15 to-purple-500/[0.04] border border-theme-blue/35 rounded-3xl p-5 shadow-sm relative overflow-hidden cursor-pointer hover:border-theme-blue/50 transition-all duration-300"
                >
                  {/* Recommended badge */}
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-[#f59e0b] shadow-sm text-white text-[10px] font-black px-3.5 py-1.5 rounded-bl-2xl">
                    추천 매칭
                  </div>
                  
                  {/* Route details */}
                  <div className="flex items-center gap-2 mb-3.5 mt-2">
                    <span className="text-sm font-black text-theme-text-primary max-w-[120px] truncate transition-colors">{room.departure}</span>
                    <ArrowRight size={14} className="text-theme-blue" />
                    <span className="text-sm font-black text-theme-text-primary max-w-[120px] truncate transition-colors">{room.destination}</span>
                  </div>

                  {/* Room Meta */}
                  <div className="flex items-center justify-between mt-3 pt-3.5 border-t border-theme-border text-xs text-theme-text-secondary font-semibold transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Clock size={14} className="text-theme-text-muted" />
                        {formatTime(room.departure_time)} 출발
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users size={14} className="text-theme-text-muted" />
                        {renderSeats(room.participant_count, room.capacity)}
                        <span>{room.participant_count}/{room.capacity}명</span>
                      </span>
                    </div>
                    
                    {/* Action button inside card */}
                    <button
                      className="px-3.5 py-2 bg-gradient-to-tr from-[#003893] to-blue-600 hover:from-theme-blue hover:to-blue-500 text-white text-[11px] font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                      style={{ minHeight: '32px' }}
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
          <div className="flex justify-between items-center px-1">
            <h3 className="text-[10px] font-black text-theme-text-muted tracking-wider uppercase transition-colors">🚗 실시간 모집 방 목록 ({filteredRooms.length})</h3>
            {filteredRooms.length > 0 && <span className="text-[9px] font-bold text-theme-text-muted transition-colors">출발 시간순 정렬</span>}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <span className="w-8 h-8 border-2 border-theme-blue border-t-transparent rounded-full animate-spin mb-3"></span>
              <span className="text-xs text-theme-text-muted transition-colors">방 목록을 불러오고 있어요...</span>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="bg-theme-panel rounded-3xl p-8 border border-theme-border text-center flex flex-col items-center justify-center transition-colors">
              <AlertCircle size={32} className="text-theme-text-muted mb-3" />
              <p className="text-sm font-bold text-theme-text-secondary transition-colors">등록된 모집 방이 없습니다.</p>
              <p className="text-xs text-theme-text-muted mt-1 transition-colors">우측 하단의 [+] 버튼을 눌러 첫 방을 만들어보세요!</p>
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
                    className="bg-theme-panel backdrop-blur-md hover:bg-theme-panel/75 rounded-2xl border border-theme-border p-4.5 shadow-sm cursor-pointer transition-all duration-300 flex flex-col"
                  >
                    {/* Top Row: status & gender tags */}
                    <div className="flex items-center justify-between mb-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${statusInfo.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`}></span>
                          {statusInfo.label}
                        </span>
                        
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          room.gender_filter === 'same_gender'
                            ? 'bg-purple-500/10 text-purple-600 border border-purple-500/20'
                            : 'bg-theme-input text-theme-text-secondary border border-theme-input-border'
                        }`}>
                          {room.gender_filter === 'same_gender' ? `동성만 (${room.host.gender})` : '성별 무관'}
                        </span>

                        {renderCountdownBadge(room.departure_time, room.status)}
                      </div>
                      
                      {/* Host Student ID indicator */}
                      <span className="text-[9px] font-bold text-theme-text-muted transition-colors">
                        방장: {room.host.student_id} ({room.host.gender})
                      </span>
                    </div>

                    {/* Route Details */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-base font-black text-theme-text-primary max-w-[150px] truncate transition-colors">{room.departure}</span>
                      <ArrowRight size={14} className="text-theme-blue" />
                      <span className="text-base font-black text-theme-text-primary max-w-[150px] truncate transition-colors">{room.destination}</span>
                    </div>

                    {/* Bottom Row: metadata & actionable states */}
                    <div className="flex items-end justify-between pt-3 border-t border-theme-border transition-colors">
                      <div className="space-y-1.5 text-xs text-theme-text-secondary font-semibold transition-colors">
                        <div className="flex items-center gap-1.5">
                          <Clock size={13} className="text-theme-text-muted" />
                          <span>출발: <strong className="text-theme-text-primary">{formatTime(room.departure_time)}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users size={13} className="text-theme-text-muted" />
                          <span className="flex items-center gap-1">
                            <span>참여:</span>
                            {renderSeats(room.participant_count, room.capacity)}
                            <strong className="text-theme-blue ml-0.5">{room.participant_count}/{room.capacity}명</strong>
                          </span>
                        </div>
                      </div>

                      {/* Room Action State Button */}
                      <div>
                        {isHost ? (
                          <div className="flex items-center gap-1 px-3.5 py-2 bg-theme-blue-light hover:bg-theme-blue/25 text-theme-blue text-xs font-bold rounded-xl border border-theme-blue/20 transition-all cursor-pointer">
                            <Settings size={13} />
                            신청자 관리
                          </div>
                        ) : isAccepted ? (
                          <div className="flex items-center gap-1 px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl border border-emerald-500/20 transition-all cursor-pointer">
                            <MessageCircle size={13} />
                            채팅 입장
                          </div>
                        ) : room.status === 'recruiting' ? (
                          <button
                            onClick={(e) => handleApply(room.id, e)}
                            className="px-4 py-2 bg-[#003893] hover:bg-[#002c73] text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                            style={{ minHeight: '36px' }}
                          >
                            참여 신청
                          </button>
                        ) : (
                          <button
                            disabled
                            className="px-3.5 py-2 bg-theme-panel text-theme-text-muted border border-theme-border text-xs font-bold rounded-xl"
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
        className="fixed bottom-8 right-[calc(50%-180px)] max-[420px]:right-6 w-13 h-13 bg-gradient-to-tr from-[#003893] to-blue-500 text-white rounded-full flex items-center justify-center shadow-glow-blue-strong z-20 transition-all active:scale-[0.9] hover:scale-[1.05] cursor-pointer"
        style={{ minHeight: '52px', minWidth: '52px' }}
        title="방 개설하기"
      >
        <Plus size={26} />
      </button>
    </div>
  );
}

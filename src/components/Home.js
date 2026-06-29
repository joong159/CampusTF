'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { getDisplayLocation, LANDMARK_COORDS, calculateDistance } from '@/components/KakaoMap';
import {
  Plus, LogOut, MapPin, Clock, Users, ArrowRight,
  MessageCircle, Settings, AlertCircle, Search, ChevronRight
} from 'lucide-react';

// Returns km between two lat/lng points
const haversineKm = (lat1, lng1, lat2, lng2) => calculateDistance(lat1, lng1, lat2, lng2) / 1000;

// Resolves known location names to coordinates. Returns null if unrecognized.
const tryGetCoords = (locationName) => {
  if (!locationName) return null;
  if (locationName.includes('|')) {
    const [, coords] = locationName.split('|');
    const [lat, lng] = coords.split(',').map(Number);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }
  const s = locationName.toLowerCase();
  if (s.includes('의정부')) return LANDMARK_COORDS.uijeongbu;
  if (s.includes('정문')) return LANDMARK_COORDS.main_gate;
  if (s.includes('터미널') || s.includes('포천터')) return LANDMARK_COORDS.terminal;
  if (s.includes('공학관') || s.includes('공학')) return LANDMARK_COORDS.engineering_bldg;
  if (s.includes('대진대역') || s.includes('선단역')) return LANDMARK_COORDS.station;
  return null;
};

// True if point C lies approximately on the straight route from A to B
// (detour ratio ≤ 1.35 and at least 0.5 km from each endpoint)
const isOnRoute = (aLat, aLng, bLat, bLng, cLat, cLng) => {
  const ab = haversineKm(aLat, aLng, bLat, bLng);
  if (ab < 0.5) return false;
  const ac = haversineKm(aLat, aLng, cLat, cLng);
  const cb = haversineKm(cLat, cLng, bLat, bLng);
  return (ac + cb) / ab <= 1.35 && ac > 0.5 && cb > 0.5;
};

const STATUS = {
  recruiting: { label: '모집중', bg: '#EFF6FF', color: '#2563EB', dot: '#2563EB' },
  closed:     { label: '모집마감', bg: '#F3F4F6', color: '#6B7280', dot: '#9CA3AF' },
  riding:     { label: '탑승중', bg: '#FFFBEB', color: '#D97706', dot: '#F59E0B' },
  settlement: { label: '정산요청', bg: '#ECFDF5', color: '#059669', dot: '#10B981' },
};

export default function Home({ user, onSelectRoom, onCreateRoomClick, onLogout, onProfileClick }) {
  const [rooms, setRooms] = useState([]);
  const [departure, setDeparture] = useState('');
  const [destination, setDestination] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const LOCATIONS = ['대진대 정문', '대진대역 1번출구', '포천터미널', '의정부역'];

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    const data = await api.rooms.list();
    setRooms(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 4000);
    return () => clearInterval(interval);
  }, [fetchRooms]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (timeStr) => {
    try {
      return new Date(timeStr).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch { return timeStr; }
  };

  const getCountdown = (timeStr, status) => {
    if (status !== 'recruiting') return null;
    const diff = new Date(timeStr) - currentTime;
    if (diff <= 0) return { text: '출발경과', style: { background: '#FEF2F2', color: '#EF4444', border: '1px solid #FECACA' } };
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return { text: '곧 출발!', style: { background: '#EF4444', color: '#FFF', fontWeight: '800' } };
    if (mins < 10) return { text: `${mins}분 남음`, style: { background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' } };
    return { text: `${mins}분 후`, style: { background: '#F3F4F6', color: '#6B7280' } };
  };

  const handleApply = async (roomId, e) => {
    e.stopPropagation();
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    if (room.gender_filter === 'same_gender' && room.host.gender !== user.user_metadata.gender) {
      alert(`이 방은 ${room.host.gender}성 전용입니다.`);
      return;
    }
    if (!window.confirm('이 택시 팟에 참여 신청하시겠습니까?')) return;
    try {
      const { error } = await api.applicants.apply(roomId, user.id);
      if (error) throw error;
      alert('신청 완료! 방장의 수락을 기다려주세요.');
      fetchRooms();
    } catch (err) {
      alert(err.message || '신청에 실패했습니다.');
    }
  };

  const filteredRooms = rooms.filter(r => {
    const dep = !departure || r.departure.toLowerCase().includes(departure.toLowerCase());
    const dest = !destination || r.destination.toLowerCase().includes(destination.toLowerCase());
    return dep && dest;
  });

  // Rooms where the user's departure point lies on the room's route (waypoint boarding)
  const waypointRooms = (() => {
    if (!departure) return [];
    const userDepCoords = tryGetCoords(departure);
    if (!userDepCoords) return [];
    return rooms.filter(r => {
      if (r.status !== 'recruiting') return false;
      // Skip rooms already shown in filteredRooms
      const alreadyShown =
        (!departure || r.departure.toLowerCase().includes(departure.toLowerCase())) &&
        (!destination || r.destination.toLowerCase().includes(destination.toLowerCase()));
      if (alreadyShown) return false;
      const roomDep = tryGetCoords(r.departure);
      const roomDest = tryGetCoords(r.destination);
      if (!roomDep || !roomDest) return false;
      const depOnRoute = isOnRoute(roomDep.lat, roomDep.lng, roomDest.lat, roomDest.lng, userDepCoords.lat, userDepCoords.lng);
      if (!depOnRoute) return false;
      if (destination) {
        const userDestCoords = tryGetCoords(destination);
        if (!userDestCoords) return true;
        return isOnRoute(roomDep.lat, roomDep.lng, roomDest.lat, roomDest.lng, userDestCoords.lat, userDestCoords.lng);
      }
      return true;
    });
  })();

  const recommendedRooms = rooms.filter(r => {
    if (r.status !== 'recruiting') return false;
    if (r.gender_filter === 'same_gender' && r.host.gender !== user.user_metadata.gender) return false;
    if (departure && destination)
      return r.departure.toLowerCase().includes(departure.toLowerCase()) &&
             r.destination.toLowerCase().includes(destination.toLowerCase());
    if (departure) return r.departure.toLowerCase().includes(departure.toLowerCase());
    if (destination) return r.destination.toLowerCase().includes(destination.toLowerCase());
    return false;
  }).slice(0, 2);

  const userGender = user.user_metadata.gender === '남' ? '남학생' : '여학생';
  const studentId = user.user_metadata.student_id;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, background: '#EEF2FF', position: 'relative', overflowY: 'auto', paddingBottom: '90px' }}>

      {/* ── Header ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: '#FFFFFF',
        borderBottom: '1px solid #F3F4F6',
        padding: '12px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 1px 8px rgba(0,0,0,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '38px', height: '38px', background: '#2563EB',
            borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
          }}>
            <span style={{ color: '#FFF', fontSize: '18px', fontWeight: '900', lineHeight: 1 }}>W</span>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: '600', lineHeight: 1, marginBottom: '2px' }}>택시 동승 매칭 & 정산</div>
            <div style={{ fontSize: '15px', fontWeight: '900', color: '#111827', lineHeight: 1 }}>위티 <span style={{ fontSize: '11px', fontWeight: '500', color: '#9CA3AF' }}>WeTee</span></div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={onProfileClick}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 10px', background: '#F8FAFF',
              border: '1px solid #E0E7FF', borderRadius: '10px',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#EFF6FF'}
            onMouseLeave={e => e.currentTarget.style.background = '#F8FAFF'}
          >
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#111827' }}>{studentId}</div>
              <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: '500' }}>{userGender} · 프로필</div>
            </div>
          </button>
          <button
            onClick={onLogout}
            style={{
              width: '36px', height: '36px', background: '#F3F4F6',
              border: 'none', borderRadius: '10px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#6B7280', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.color = '#EF4444'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#F3F4F6'; e.currentTarget.style.color = '#6B7280'; }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* ── Search Card ── */}
      <div style={{
        margin: '14px 14px 0',
        background: '#FFFFFF', borderRadius: '18px',
        padding: '16px',
        boxShadow: '0 2px 12px rgba(37,99,235,0.08)',
        border: '1px solid #E0E7FF',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
          <Search size={15} style={{ color: '#2563EB' }} />
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>어디로 이동하시나요?</span>
        </div>

        {/* Route inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)',
              width: '8px', height: '8px', borderRadius: '50%', background: '#3B82F6',
            }} />
            <input
              type="text"
              value={departure}
              onChange={e => setDeparture(e.target.value)}
              placeholder="출발지를 입력하세요"
              style={{
                width: '100%', height: '44px', paddingLeft: '30px', paddingRight: '12px',
                background: '#F8FAFF', border: '1.5px solid #E0E7FF', borderRadius: '10px',
                fontSize: '13px', color: '#111827', outline: 'none', transition: 'all 0.18s',
                boxSizing: 'border-box',
              }}
              onFocus={e => { e.target.style.borderColor = '#2563EB'; e.target.style.background = '#FFF'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
              onBlur={e => { e.target.style.borderColor = '#E0E7FF'; e.target.style.background = '#F8FAFF'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)',
              width: '8px', height: '8px', borderRadius: '2px', background: '#EF4444',
            }} />
            <input
              type="text"
              value={destination}
              onChange={e => setDestination(e.target.value)}
              placeholder="목적지를 입력하세요"
              style={{
                width: '100%', height: '44px', paddingLeft: '30px', paddingRight: '12px',
                background: '#F8FAFF', border: '1.5px solid #E0E7FF', borderRadius: '10px',
                fontSize: '13px', color: '#111827', outline: 'none', transition: 'all 0.18s',
                boxSizing: 'border-box',
              }}
              onFocus={e => { e.target.style.borderColor = '#2563EB'; e.target.style.background = '#FFF'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
              onBlur={e => { e.target.style.borderColor = '#E0E7FF'; e.target.style.background = '#F8FAFF'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
        </div>

        {/* Quick chips */}
        <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
          {LOCATIONS.map(loc => (
            <button
              key={loc}
              onClick={() => {
                if (!departure) setDeparture(loc);
                else if (!destination && departure !== loc) setDestination(loc);
                else { setDeparture(loc); setDestination(''); }
              }}
              style={{
                padding: '6px 11px', background: '#EEF2FF', color: '#4338CA',
                border: '1px solid #C7D2FE', borderRadius: '20px',
                fontSize: '11px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#E0E7FF'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#EEF2FF'; }}
            >
              {loc}
            </button>
          ))}
          {(departure || destination) && (
            <button
              onClick={() => { setDeparture(''); setDestination(''); }}
              style={{
                padding: '6px 11px', background: '#FEF2F2', color: '#EF4444',
                border: '1px solid #FECACA', borderRadius: '20px',
                fontSize: '11px', fontWeight: '600', cursor: 'pointer',
              }}
            >
              초기화
            </button>
          )}
        </div>
      </div>

      {/* ── Recommended Rooms ── */}
      {recommendedRooms.length > 0 && (
        <div style={{ margin: '14px 14px 0' }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '10px' }}>
            ✨ 나와 딱 맞는 추천
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recommendedRooms.map(room => (
              <div
                key={room.id}
                onClick={() => onSelectRoom(room.id)}
                style={{
                  background: 'linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)',
                  borderRadius: '16px', padding: '16px',
                  cursor: 'pointer', position: 'relative', overflow: 'hidden',
                  boxShadow: '0 6px 20px rgba(37,99,235,0.28)',
                }}
              >
                <div style={{
                  position: 'absolute', top: 0, right: 0,
                  background: '#F59E0B', color: '#FFF',
                  fontSize: '10px', fontWeight: '800',
                  padding: '5px 12px', borderRadius: '0 16px 0 12px',
                }}>
                  추천 매칭
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', marginTop: '4px' }}>
                  <span style={{ fontSize: '17px', fontWeight: '900', color: '#FFF' }}>{getDisplayLocation(room.departure)}</span>
                  <ArrowRight size={15} style={{ color: 'rgba(255,255,255,0.6)', flexShrink: 0 }} />
                  <span style={{ fontSize: '17px', fontWeight: '900', color: '#FFF' }}>{getDisplayLocation(room.destination)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: '12px', color: 'rgba(255,255,255,0.75)', fontSize: '12px', fontWeight: '600' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {formatTime(room.departure_time)}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Users size={12} /> {room.participant_count}/{room.capacity}명
                    </span>
                  </div>
                  <span style={{
                    background: 'rgba(255,255,255,0.2)', color: '#FFF',
                    fontSize: '11px', fontWeight: '700',
                    padding: '5px 10px', borderRadius: '8px',
                    display: 'flex', alignItems: 'center', gap: '3px',
                  }}>
                    상세 보기 <ChevronRight size={11} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Waypoint Rooms ── */}
      {waypointRooms.length > 0 && (
        <div style={{ margin: '14px 14px 0' }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '10px' }}>
            🔀 경유 탑승 가능 ({waypointRooms.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {waypointRooms.map(room => {
              const isHost = room.created_by === user.id;
              const isAccepted = (room.accepted_user_ids || []).includes(user.id);
              return (
                <div
                  key={room.id}
                  onClick={() => onSelectRoom(room.id)}
                  style={{
                    background: 'linear-gradient(135deg, #5B21B6 0%, #7C3AED 100%)',
                    borderRadius: '16px', padding: '16px',
                    cursor: 'pointer', position: 'relative', overflow: 'hidden',
                    boxShadow: '0 6px 20px rgba(124,58,237,0.28)',
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 0, right: 0,
                    background: '#F59E0B', color: '#FFF',
                    fontSize: '10px', fontWeight: '800',
                    padding: '5px 12px', borderRadius: '0 16px 0 12px',
                  }}>
                    경유 탑승
                  </div>

                  {/* Full route */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', marginTop: '4px' }}>
                    <span style={{ fontSize: '16px', fontWeight: '900', color: '#FFF' }}>{getDisplayLocation(room.departure)}</span>
                    <ArrowRight size={14} style={{ color: 'rgba(255,255,255,0.55)', flexShrink: 0 }} />
                    <span style={{ fontSize: '16px', fontWeight: '900', color: '#FFF' }}>{getDisplayLocation(room.destination)}</span>
                  </div>

                  {/* Waypoint hint */}
                  <div style={{
                    background: 'rgba(255,255,255,0.15)', borderRadius: '8px',
                    padding: '6px 10px', fontSize: '11px',
                    color: 'rgba(255,255,255,0.9)', fontWeight: '600', marginBottom: '10px',
                  }}>
                    📍 <strong>{departure}</strong> 경유 — 이 방 택시가 내 출발지를 지나가요
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '12px', color: 'rgba(255,255,255,0.75)', fontSize: '12px', fontWeight: '600' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> {formatTime(room.departure_time)}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={12} /> {room.participant_count}/{room.capacity}명
                      </span>
                    </div>
                    {isHost ? (
                      <button
                        onClick={e => { e.stopPropagation(); onSelectRoom(room.id); }}
                        style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.2)', color: '#FFF', border: 'none', borderRadius: '9px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Settings size={12} /> 관리
                      </button>
                    ) : isAccepted ? (
                      <button
                        onClick={e => { e.stopPropagation(); onSelectRoom(room.id); }}
                        style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.2)', color: '#FFF', border: 'none', borderRadius: '9px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <MessageCircle size={12} /> 채팅
                      </button>
                    ) : (
                      <button
                        onClick={e => handleApply(room.id, e)}
                        style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.25)', color: '#FFF', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '9px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        신청하기
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Room List ── */}
      <div style={{ margin: '14px 14px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '11px', fontWeight: '800', color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            🚗 실시간 모집 ({filteredRooms.length})
          </span>
          <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: '500' }}>출발시간순</span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0' }}>
            <span style={{
              width: '26px', height: '26px',
              border: '2.5px solid #BFDBFE', borderTopColor: '#2563EB',
              borderRadius: '50%', display: 'block',
              animation: 'spin 0.8s linear infinite', marginBottom: '12px',
            }} />
            <span style={{ fontSize: '13px', color: '#9CA3AF' }}>불러오는 중...</span>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div style={{
            background: '#FFFFFF', borderRadius: '16px', padding: '36px 20px',
            textAlign: 'center', border: '1px solid #F3F4F6',
          }}>
            <AlertCircle size={32} style={{ color: '#D1D5DB', margin: '0 auto 12px' }} />
            <p style={{ fontSize: '14px', fontWeight: '700', color: '#4B5563', margin: '0 0 4px' }}>등록된 방이 없어요</p>
            <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>+ 버튼으로 방을 개설해보세요!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredRooms.map(room => {
              const s = STATUS[room.status] || STATUS.closed;
              const isHost = room.created_by === user.id;
              const isAccepted = (room.accepted_user_ids || []).includes(user.id);
              const countdown = getCountdown(room.departure_time, room.status);

              return (
                <div
                  key={room.id}
                  onClick={() => onSelectRoom(room.id)}
                  style={{
                    background: '#FFFFFF', borderRadius: '16px',
                    border: '1px solid #F3F4F6',
                    padding: '14px 14px 12px',
                    cursor: 'pointer', transition: 'all 0.15s',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#BFDBFE'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#F3F4F6'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
                >
                  {/* Badges row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      padding: '4px 9px', borderRadius: '20px',
                      background: s.bg, color: s.color,
                      fontSize: '11px', fontWeight: '700',
                    }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
                      {s.label}
                    </span>

                    <span style={{
                      padding: '4px 9px', borderRadius: '20px',
                      fontSize: '11px', fontWeight: '600',
                      background: room.gender_filter === 'same_gender' ? '#F5F3FF' : '#F3F4F6',
                      color: room.gender_filter === 'same_gender' ? '#7C3AED' : '#6B7280',
                    }}>
                      {room.gender_filter === 'same_gender' ? `동성만 (${room.host.gender})` : '성별무관'}
                    </span>

                    {countdown && (
                      <span style={{
                        padding: '4px 9px', borderRadius: '20px',
                        fontSize: '11px', fontWeight: '700',
                        ...countdown.style,
                      }}>
                        {countdown.text}
                      </span>
                    )}
                  </div>

                  {/* Route */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '17px', fontWeight: '900', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '42%' }}>
                      {getDisplayLocation(room.departure)}
                    </span>
                    <ArrowRight size={14} style={{ color: '#2563EB', flexShrink: 0 }} />
                    <span style={{ fontSize: '17px', fontWeight: '900', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '42%' }}>
                      {getDisplayLocation(room.destination)}
                    </span>
                  </div>

                  {/* Meta + Action */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid #F3F4F6' }}>
                    <div style={{ display: 'flex', gap: '12px', color: '#6B7280', fontSize: '12px', fontWeight: '500' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} style={{ color: '#9CA3AF' }} />
                        {formatTime(room.departure_time)}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={12} style={{ color: '#9CA3AF' }} />
                        <span style={{ color: '#2563EB', fontWeight: '700' }}>{room.participant_count}</span>
                        <span>/{room.capacity}명</span>
                      </span>
                    </div>

                    {isHost ? (
                      <button
                        onClick={e => { e.stopPropagation(); onSelectRoom(room.id); }}
                        style={actionBtnStyle('#EFF6FF', '#2563EB', '#BFDBFE')}
                      >
                        <Settings size={12} /> 관리
                      </button>
                    ) : isAccepted ? (
                      <button
                        onClick={e => { e.stopPropagation(); onSelectRoom(room.id); }}
                        style={actionBtnStyle('#ECFDF5', '#059669', '#A7F3D0')}
                      >
                        <MessageCircle size={12} /> 채팅
                      </button>
                    ) : room.status === 'recruiting' ? (
                      <button
                        onClick={e => handleApply(room.id, e)}
                        style={{
                          padding: '7px 14px', background: '#2563EB', color: '#FFF',
                          border: 'none', borderRadius: '9px',
                          fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '4px',
                          boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#1D4ED8'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#2563EB'; }}
                      >
                        신청하기
                      </button>
                    ) : (
                      <span style={actionBtnStyle('#F3F4F6', '#9CA3AF', '#E5E7EB')}>
                        신청불가
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── FAB ── */}
      <button
        onClick={onCreateRoomClick}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: 'calc(50% - 186px)',
          width: '54px', height: '54px',
          background: '#2563EB',
          border: 'none', borderRadius: '16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#FFF', cursor: 'pointer',
          boxShadow: '0 6px 20px rgba(37,99,235,0.4)',
          transition: 'all 0.18s',
          zIndex: 30,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#1D4ED8'; e.currentTarget.style.transform = 'scale(1.06)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#2563EB'; e.currentTarget.style.transform = 'scale(1)'; }}
        onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.93)'; }}
        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1.06)'; }}
        title="방 개설하기"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>
    </div>
  );
}

function actionBtnStyle(bg, color, border) {
  return {
    padding: '7px 12px', background: bg, color,
    border: `1px solid ${border}`, borderRadius: '9px',
    fontSize: '12px', fontWeight: '700', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    transition: 'all 0.15s',
  };
}

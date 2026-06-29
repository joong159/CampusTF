'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { ArrowLeft, Check, X, MessageCircle, Users, Clock, AlertCircle } from 'lucide-react';

export default function ApplicantManagement({ user, roomId, onBack, onEnterChat }) {
  const [room, setRoom]           = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading]     = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const roomsList = await api.rooms.list();
      const currentRoom = roomsList.find(r => r.id === roomId);
      setRoom(currentRoom);
      if (currentRoom) {
        const apps = await api.applicants.list(roomId);
        setApplicants(apps);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [roomId]);

  useEffect(() => {
    const t = setTimeout(fetchData, 0);
    const iv = setInterval(fetchData, 3000);
    return () => { clearTimeout(t); clearInterval(iv); };
  }, [fetchData]);

  const handleStatus = async (applicantId, status) => {
    const label = status === 'accepted' ? '수락' : '거절';
    if (!window.confirm(`이 탑승자의 신청을 ${label}하시겠습니까?`)) return;
    try {
      const { error } = await api.applicants.updateStatus(applicantId, status);
      if (error) throw error;
      if (status === 'accepted') {
        const newAccepted = applicants.filter(a => a.status === 'accepted').length + 1;
        if (room && newAccepted + 1 >= room.capacity) {
          await api.rooms.updateStatus(roomId, 'closed');
        }
      }
      fetchData();
    } catch (err) { alert(err.message || '상태 업데이트 실패'); }
  };

  if (loading && !room) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#EEF2FF' }}>
        <span style={{ width: '28px', height: '28px', border: '2.5px solid #BFDBFE', borderTopColor: '#2563EB', borderRadius: '50%', display: 'block', animation: 'spin 0.8s linear infinite', marginBottom: '12px' }} />
        <span style={{ fontSize: '13px', color: '#9CA3AF' }}>불러오는 중...</span>
      </div>
    );
  }

  if (!room) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#EEF2FF', padding: '24px', textAlign: 'center' }}>
        <AlertCircle size={36} style={{ color: '#EF4444', marginBottom: '12px' }} />
        <p style={{ fontSize: '14px', fontWeight: '700', color: '#4B5563' }}>방 정보를 찾을 수 없습니다.</p>
        <button onClick={onBack} style={{ marginTop: '16px', padding: '10px 20px', background: '#F3F4F6', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', color: '#6B7280' }}>
          홈으로
        </button>
      </div>
    );
  }

  const acceptedCount = applicants.filter(a => a.status === 'accepted').length + 1;
  const pendingApps   = applicants.filter(a => a.status === 'pending');
  const otherApps     = applicants.filter(a => a.status !== 'pending');
  const isFull        = acceptedCount >= room.capacity;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, background: '#EEF2FF', overflowY: 'auto', paddingBottom: '30px' }}>

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: '#FFFFFF', borderBottom: '1px solid #F3F4F6',
        padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 1px 8px rgba(0,0,0,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={onBack} style={{ width: '36px', height: '36px', background: '#F3F4F6', border: 'none', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6B7280' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '900', color: '#111827' }}>신청자 관리</div>
            <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '1px' }}>{room.departure} → {room.destination}</div>
          </div>
        </div>
        <button
          onClick={onEnterChat}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#2563EB', border: 'none', borderRadius: '12px', color: '#FFF', fontSize: '12px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }}
        >
          <MessageCircle size={14} />
          채팅방
        </button>
      </header>

      {/* 방 정보 카드 */}
      <div style={{ margin: '14px 14px 0', background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)', borderRadius: '18px', padding: '16px', boxShadow: '0 6px 20px rgba(37,99,235,0.28)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>내 모집 방</span>
          <span style={{
            padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '700',
            background: isFull ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.2)',
            color: isFull ? '#FCA5A5' : 'rgba(255,255,255,0.9)',
            border: `1px solid ${isFull ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.3)'}`,
          }}>
            {isFull ? '마감' : '모집중'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span style={{ fontSize: '17px', fontWeight: '900', color: '#FFF' }}>{room.departure}</span>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>→</span>
          <span style={{ fontSize: '17px', fontWeight: '900', color: '#FFF' }}>{room.destination}</span>
        </div>
        <div style={{ display: 'flex', gap: '16px', color: 'rgba(255,255,255,0.75)', fontSize: '12px', fontWeight: '600' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Clock size={12} />
            {new Date(room.departure_time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Users size={12} />
            {acceptedCount} / {room.capacity}명 참여
          </span>
        </div>
        {/* 인원 프로그레스 바 */}
        <div style={{ marginTop: '10px', background: 'rgba(255,255,255,0.2)', borderRadius: '999px', height: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: isFull ? '#FCA5A5' : '#FFF', borderRadius: '999px', width: `${(acceptedCount / room.capacity) * 100}%`, transition: 'width 0.4s' }} />
        </div>
      </div>

      {/* 대기 신청 */}
      <div style={{ margin: '14px 14px 0' }}>
        <div style={{ fontSize: '11px', fontWeight: '800', color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '10px' }}>
          ⏳ 대기 중인 신청 ({pendingApps.length})
        </div>

        {pendingApps.length === 0 ? (
          <div style={{ background: '#FFF', borderRadius: '16px', padding: '32px 20px', textAlign: 'center', border: '1px solid #F3F4F6' }}>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#9CA3AF', margin: 0 }}>새로운 신청자가 없어요</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pendingApps.map(app => (
              <div key={app.id} style={{ background: '#FFF', borderRadius: '16px', padding: '14px 14px 12px', border: '1px solid #F3F4F6', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* 아바타 */}
                  <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: app.user.gender === '남' ? '#EFF6FF' : '#FDF2F8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                    {app.user.gender === '남' ? '👨' : '👩'}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#111827', marginBottom: '2px' }}>{app.user.student_id}</div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: '500' }}>{app.user.gender}성</span>
                      {app.is_midway && (
                        <span style={{ fontSize: '10px', padding: '1px 6px', background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A', borderRadius: '8px', fontWeight: '700' }}>
                          경유 탑승
                        </span>
                      )}
                    </div>
                    {app.is_midway && app.midway_location && (
                      <div style={{ fontSize: '10px', color: '#D97706', marginTop: '2px', fontWeight: '600' }}>📍 {app.midway_location}</div>
                    )}
                  </div>
                </div>

                {/* 수락/거절 버튼 */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleStatus(app.id, 'rejected')}
                    style={{ width: '40px', height: '40px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#EF4444', transition: 'all 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FEE2E2'}
                    onMouseLeave={e => e.currentTarget.style.background = '#FEF2F2'}
                  >
                    <X size={16} />
                  </button>
                  <button
                    onClick={() => handleStatus(app.id, 'accepted')}
                    style={{ width: '40px', height: '40px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#2563EB', transition: 'all 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#DBEAFE'}
                    onMouseLeave={e => e.currentTarget.style.background = '#EFF6FF'}
                  >
                    <Check size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 처리된 신청 */}
      {otherApps.length > 0 && (
        <div style={{ margin: '14px 14px 0' }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '10px' }}>
            처리된 신청 ({otherApps.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {otherApps.map(app => (
              <div key={app.id} style={{ background: '#FFF', borderRadius: '14px', padding: '12px 14px', border: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                    {app.user.gender === '남' ? '👨' : '👩'}
                  </div>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#4B5563' }}>{app.user.student_id}</span>
                    {app.is_midway && <span style={{ marginLeft: '6px', fontSize: '10px', color: '#D97706' }}>경유</span>}
                  </div>
                </div>
                {app.status === 'accepted' ? (
                  <span style={{ padding: '4px 10px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#059669', borderRadius: '8px', fontSize: '11px', fontWeight: '700' }}>수락됨</span>
                ) : (
                  <span style={{ padding: '4px 10px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#EF4444', borderRadius: '8px', fontSize: '11px', fontWeight: '700' }}>거절됨</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

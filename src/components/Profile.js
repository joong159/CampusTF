'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { ArrowLeft, Star, MapPin, Users, Award } from 'lucide-react';

function StarRating({ score, size = 16 }) {
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          size={size}
          fill={s <= Math.round(score) ? '#F59E0B' : 'none'}
          style={{ color: s <= Math.round(score) ? '#F59E0B' : '#D1D5DB' }}
        />
      ))}
    </div>
  );
}

export default function Profile({ user, onBack }) {
  const [avgRating, setAvgRating] = useState(null);
  const [rideCount, setRideCount] = useState(0);
  const [hostedCount, setHostedCount] = useState(0);

  useEffect(() => {
    async function loadProfile() {
      try {
        const rating = await api.ratings.getAverage(user.id);
        setAvgRating(rating);

        const rooms = await api.rooms.list();
        const hosted = rooms.filter(r => r.created_by === user.id);
        const joined = rooms.filter(r =>
          r.created_by !== user.id &&
          (r.accepted_user_ids || []).includes(user.id)
        );
        setHostedCount(hosted.length);
        setRideCount(joined.length);
      } catch (e) { console.error(e); }
    }
    loadProfile();
  }, [user.id]);

  const meta = user.user_metadata || {};
  const nickname = meta.student_id || meta.nickname || user.email?.split('@')[0] || '탑승자';
  const gender = meta.gender || '';
  const university = meta.university || '';
  const initial = nickname.charAt(0).toUpperCase();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, background: '#EEF2FF', overflowY: 'auto', paddingBottom: '30px' }}>

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: '#FFFFFF', borderBottom: '1px solid #F3F4F6',
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px',
        boxShadow: '0 1px 8px rgba(0,0,0,0.05)',
      }}>
        <button onClick={onBack} style={{ width: '36px', height: '36px', background: '#F3F4F6', border: 'none', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6B7280' }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ fontSize: '15px', fontWeight: '900', color: '#111827' }}>내 프로필</div>
      </header>

      {/* 프로필 히어로 */}
      <div style={{ background: 'linear-gradient(145deg, #1E3A8A, #2563EB)', padding: '32px 20px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        {/* 아바타 */}
        <div style={{
          width: '80px', height: '80px',
          background: '#FFF', borderRadius: '24px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '36px', fontWeight: '900', color: '#2563EB',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        }}>
          {gender === '남' ? '👨' : gender === '여' ? '👩' : initial}
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: '900', color: '#FFF', marginBottom: '4px' }}>{nickname}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {gender && (
              <span style={{ padding: '3px 10px', background: 'rgba(255,255,255,0.2)', borderRadius: '20px', fontSize: '11px', color: 'rgba(255,255,255,0.9)', fontWeight: '600' }}>
                {gender}성
              </span>
            )}
            {university && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 10px', background: 'rgba(255,255,255,0.15)', borderRadius: '20px', fontSize: '11px', color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>
                <MapPin size={10} />
                {university}
              </span>
            )}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', marginTop: '4px' }}>{user.email}</div>
        </div>

        {/* 별점 */}
        <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '16px', padding: '12px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', border: '1px solid rgba(255,255,255,0.15)' }}>
          {avgRating !== null ? (
            <>
              <StarRating score={avgRating} size={20} />
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#FFF', lineHeight: 1 }}>{avgRating.toFixed(1)}</div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>동승자 평균 별점</div>
            </>
          ) : (
            <>
              <StarRating score={0} size={20} />
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginTop: '2px' }}>아직 받은 평점이 없어요</div>
            </>
          )}
        </div>
      </div>

      {/* 통계 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '14px 14px 0' }}>
        <div style={{ background: '#FFF', borderRadius: '16px', padding: '18px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #F3F4F6' }}>
          <div style={{ width: '40px', height: '40px', background: '#EFF6FF', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
            <Users size={18} style={{ color: '#2563EB' }} />
          </div>
          <div style={{ fontSize: '26px', fontWeight: '900', color: '#111827', lineHeight: 1 }}>{rideCount}</div>
          <div style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: '600', marginTop: '4px' }}>참여한 팟</div>
        </div>
        <div style={{ background: '#FFF', borderRadius: '16px', padding: '18px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #F3F4F6' }}>
          <div style={{ width: '40px', height: '40px', background: '#F0FDF4', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
            <Award size={18} style={{ color: '#059669' }} />
          </div>
          <div style={{ fontSize: '26px', fontWeight: '900', color: '#111827', lineHeight: 1 }}>{hostedCount}</div>
          <div style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: '600', marginTop: '4px' }}>개설한 팟</div>
        </div>
      </div>

      {/* 안내 카드 */}
      <div style={{ margin: '12px 14px 0', background: '#FFF', borderRadius: '16px', padding: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #F3F4F6' }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '12px' }}>⭐ 별점 시스템 안내</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { icon: '✅', text: '정산 완료 후 동승자가 서로 별점을 줘요' },
            { icon: '🔒', text: '같은 방 안에서는 1회만 평가 가능해요' },
            { icon: '📊', text: '평균 별점이 프로필에 공개돼요' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: '#6B7280', lineHeight: 1.4 }}>
              <span>{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 이메일/계정 정보 */}
      <div style={{ margin: '12px 14px 0', background: '#FFF', borderRadius: '16px', padding: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #F3F4F6' }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '12px' }}>계정 정보</div>
        {[
          { label: '이메일', value: user.email },
          { label: '닉네임', value: nickname },
          { label: '성별', value: gender ? `${gender}성` : '미설정' },
          { label: '대학교', value: university || '미설정' },
        ].map(row => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F9FAFB' }}>
            <span style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: '500' }}>{row.label}</span>
            <span style={{ fontSize: '12px', color: '#111827', fontWeight: '600' }}>{row.value}</span>
          </div>
        ))}
      </div>

    </div>
  );
}

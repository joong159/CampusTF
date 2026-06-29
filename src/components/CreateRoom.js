'use client';

import { useState, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import KakaoMap, { getRouteDetails, getCoordinates, LANDMARK_COORDS } from '@/components/KakaoMap';
import { ArrowLeft, MapPin, Clock, Users, ShieldCheck, CreditCard, Link2, Search, X, ChevronDown } from 'lucide-react';

const PRESET_LOCATIONS = [
  { name: '대진대역 1번출구', lat: 37.875184, lng: 127.156525 },
  { name: '대진대 정문',     lat: 37.896245, lng: 127.186847 },
  { name: '대진대 공학관',   lat: 37.899120, lng: 127.183492 },
  { name: '포천터미널',      lat: 37.894812, lng: 127.206691 },
  { name: '의정부역',        lat: 37.738411, lng: 127.045934 },
];

const BANK_OPTIONS = ['국민은행', '신한은행', '우리은행', '하나은행', '카카오뱅크', '토스뱅크', '농협'];

const card = {
  background: '#FFFFFF', borderRadius: '18px',
  padding: '18px', margin: '0 14px 14px',
  boxShadow: '0 2px 12px rgba(37,99,235,0.07)',
  border: '1px solid #E0E7FF',
};

const inputStyle = (focused) => ({
  width: '100%', height: '46px',
  paddingLeft: '38px', paddingRight: '36px',
  background: focused ? '#FFF' : '#F8FAFF',
  border: `1.5px solid ${focused ? '#2563EB' : '#E0E7FF'}`,
  borderRadius: '12px', fontSize: '13px', color: '#111827',
  outline: 'none', boxSizing: 'border-box',
  boxShadow: focused ? '0 0 0 3px rgba(37,99,235,0.1)' : 'none',
  transition: 'all 0.15s',
});

export default function CreateRoom({ user, onBack, onRoomCreated }) {
  const [departure, setDeparture]     = useState('');
  const [destination, setDestination] = useState('');
  const [departureInput, setDepartureInput]     = useState('');
  const [destinationInput, setDestinationInput] = useState('');
  const [departureSuggestions, setDepartureSuggestions]   = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  const [showDepSuggestions, setShowDepSuggestions]   = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const [focusDep, setFocusDep]   = useState(false);
  const [focusDest, setFocusDest] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);

  const [departureTime, setDepartureTime] = useState('');
  const [capacity, setCapacity]           = useState(4);
  const [genderFilter, setGenderFilter]   = useState('anyone');
  const [bankName, setBankName]           = useState('국민은행');
  const [accountNumber, setAccountNumber] = useState('');
  const [kakaopayUrl, setKakaopayUrl]     = useState('');
  const [loading, setLoading]             = useState(false);

  const depDebounceRef  = useRef(null);
  const destDebounceRef = useRef(null);

  const fetchSuggestions = useCallback((query, isDeparture) => {
    const setSuggestions = isDeparture ? setDepartureSuggestions : setDestinationSuggestions;
    if (!query.trim()) { setSuggestions(PRESET_LOCATIONS); return; }
    if (typeof window !== 'undefined' && window.kakao?.maps?.services) {
      const ps = new window.kakao.maps.services.Places();
      ps.keywordSearch(query, (data, status) => {
        if (status === window.kakao.maps.services.Status.OK) {
          setSuggestions(data.slice(0, 6).map(item => ({
            name: item.place_name,
            address: item.road_address_name || item.address_name,
            lat: parseFloat(item.y), lng: parseFloat(item.x),
          })));
        } else {
          setSuggestions(PRESET_LOCATIONS.filter(p => p.name.includes(query)));
        }
      });
    } else {
      setSuggestions(PRESET_LOCATIONS.filter(p => p.name.includes(query)));
    }
  }, []);

  const handleDepInput = (e) => {
    const val = e.target.value;
    setDepartureInput(val);
    setShowDepSuggestions(true);
    clearTimeout(depDebounceRef.current);
    depDebounceRef.current = setTimeout(() => fetchSuggestions(val, true), 250);
  };

  const handleDestInput = (e) => {
    const val = e.target.value;
    setDestinationInput(val);
    setShowDestSuggestions(true);
    clearTimeout(destDebounceRef.current);
    destDebounceRef.current = setTimeout(() => fetchSuggestions(val, false), 250);
  };

  const selectDeparture = (item) => {
    const isPreset = PRESET_LOCATIONS.some(p => p.name === item.name);
    setDeparture(isPreset ? item.name : `${item.name}|${item.lat},${item.lng}`);
    setDepartureInput(item.name);
    setDepartureSuggestions([]); setShowDepSuggestions(false); setRouteInfo(null);
  };

  const selectDestination = (item) => {
    const isPreset = PRESET_LOCATIONS.some(p => p.name === item.name);
    setDestination(isPreset ? item.name : `${item.name}|${item.lat},${item.lng}`);
    setDestinationInput(item.name);
    setDestinationSuggestions([]); setShowDestSuggestions(false); setRouteInfo(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!departure || !destination) { alert('출발지와 목적지를 입력해주세요.'); return; }
    if (departure === destination) { alert('출발지와 목적지가 동일합니다.'); return; }
    if (!departureTime) { alert('출발 시간을 선택해주세요.'); return; }
    if (!accountNumber) { alert('정산용 계좌번호를 입력해주세요.'); return; }
    setLoading(true);
    try {
      const { data, error } = await api.rooms.create({
        departure, destination,
        departure_time: new Date(departureTime).toISOString(),
        capacity: parseInt(capacity),
        gender_filter: genderFilter,
        bank_account: `${bankName} ${accountNumber.trim()}`,
        kakaopay_url: kakaopayUrl.trim() || null,
      }, user.id);
      if (error) throw error;
      alert('택시 동승 방이 성공적으로 생성되었습니다!');
      onRoomCreated(data.id);
    } catch (err) {
      alert(err.message || '방 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const displayedRoute = routeInfo || (departure && destination && departure !== destination ? getRouteDetails(departure, destination) : null);
  const userGender = user.user_metadata.gender;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, background: '#EEF2FF', overflowY: 'auto', paddingBottom: '30px' }}>

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: '#FFFFFF', borderBottom: '1px solid #F3F4F6',
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px',
        boxShadow: '0 1px 8px rgba(0,0,0,0.05)',
      }}>
        <button
          onClick={onBack}
          style={{ width: '36px', height: '36px', background: '#F3F4F6', border: 'none', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6B7280', flexShrink: 0 }}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <div style={{ fontSize: '15px', fontWeight: '900', color: '#111827', lineHeight: 1 }}>택시 팟 만들기</div>
          <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: '500', marginTop: '2px' }}>경로와 조건을 설정하세요</div>
        </div>
      </header>

      <form onSubmit={handleSubmit}>

        {/* ── 경로 카드 ── */}
        <div style={{ ...card, marginTop: '14px' }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: '#2563EB', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={13} />
            출발 및 도착 경로
          </div>

          {/* 출발지 */}
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>출발지</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '8px', height: '8px', borderRadius: '50%', background: '#3B82F6', zIndex: 1 }} />
              <input
                type="text" value={departureInput} onChange={handleDepInput}
                onFocus={() => { setFocusDep(true); setShowDepSuggestions(true); fetchSuggestions(departureInput, true); }}
                onBlur={() => { setFocusDep(false); setTimeout(() => setShowDepSuggestions(false), 180); }}
                placeholder="장소명 검색 (예: 포천, 의정부역...)"
                style={inputStyle(focusDep)}
                autoComplete="off"
              />
              {departureInput && (
                <button type="button" onClick={() => { setDeparture(''); setDepartureInput(''); setRouteInfo(null); }}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '2px' }}>
                  <X size={14} />
                </button>
              )}
              {showDepSuggestions && departureSuggestions.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: '#FFF', border: '1px solid #E0E7FF', borderRadius: '14px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 50, overflow: 'hidden', maxHeight: '200px', overflowY: 'auto' }}>
                  {!departureInput && <div style={{ padding: '8px 14px', fontSize: '9px', fontWeight: '800', color: '#9CA3AF', textTransform: 'uppercase', borderBottom: '1px solid #F3F4F6' }}>추천 거점</div>}
                  {departureSuggestions.map((item, i) => (
                    <button key={i} type="button" onMouseDown={() => selectDeparture(item)}
                      style={{ width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: '1px solid #F9FAFB', display: 'flex', alignItems: 'center', gap: '8px' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F0F4FF'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <MapPin size={11} style={{ color: '#3B82F6', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#111827' }}>{item.name}</div>
                        {item.address && <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '1px' }}>{item.address}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 경로 연결선 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0 10px', paddingLeft: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
              <div style={{ width: '1px', height: '6px', background: '#CBD5E1' }} />
              <div style={{ width: '1px', height: '6px', background: '#CBD5E1' }} />
            </div>
            <span style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: '500' }}>경유</span>
          </div>

          {/* 도착지 */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>도착지</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '8px', height: '8px', borderRadius: '2px', background: '#EF4444', zIndex: 1 }} />
              <input
                type="text" value={destinationInput} onChange={handleDestInput}
                onFocus={() => { setFocusDest(true); setShowDestSuggestions(true); fetchSuggestions(destinationInput, false); }}
                onBlur={() => { setFocusDest(false); setTimeout(() => setShowDestSuggestions(false), 180); }}
                placeholder="목적지 검색 (예: 서울역, 강남역...)"
                style={inputStyle(focusDest)}
                autoComplete="off"
              />
              {destinationInput && (
                <button type="button" onClick={() => { setDestination(''); setDestinationInput(''); setRouteInfo(null); }}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '2px' }}>
                  <X size={14} />
                </button>
              )}
              {showDestSuggestions && destinationSuggestions.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: '#FFF', border: '1px solid #E0E7FF', borderRadius: '14px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 50, overflow: 'hidden', maxHeight: '200px', overflowY: 'auto' }}>
                  {!destinationInput && <div style={{ padding: '8px 14px', fontSize: '9px', fontWeight: '800', color: '#9CA3AF', textTransform: 'uppercase', borderBottom: '1px solid #F3F4F6' }}>추천 거점</div>}
                  {destinationSuggestions.map((item, i) => (
                    <button key={i} type="button" onMouseDown={() => selectDestination(item)}
                      style={{ width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: '1px solid #F9FAFB', display: 'flex', alignItems: 'center', gap: '8px' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#FFF5F5'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <MapPin size={11} style={{ color: '#EF4444', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#111827' }}>{item.name}</div>
                        {item.address && <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '1px' }}>{item.address}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 지도 미리보기 */}
          {(departure || destination) && (
            <div style={{ marginTop: '14px' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#9CA3AF', marginBottom: '6px', textTransform: 'uppercase' }}>경로 미리보기</div>
              <KakaoMap departure={departure} destination={destination} onRouteInfoUpdate={setRouteInfo} />
            </div>
          )}

          {/* 예상 요금 배너 */}
          {displayedRoute && (
            <div style={{ marginTop: '12px', background: 'linear-gradient(135deg, #EFF6FF, #EDE9FE)', borderRadius: '14px', padding: '14px', border: '1px solid #BFDBFE' }}>
              <div style={{ fontSize: '10px', fontWeight: '800', color: '#2563EB', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CreditCard size={12} />
                예상 요금 & 1/N 분담금
                {routeInfo && <span style={{ marginLeft: 'auto', fontSize: '9px', background: '#ECFDF5', color: '#059669', padding: '2px 6px', borderRadius: '6px', border: '1px solid #A7F3D0' }}>실시간</span>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#4B5563', marginBottom: '8px' }}>
                <span>이동 거리</span>
                <strong style={{ color: '#111827' }}>{displayedRoute.distance}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #DBEAFE' }}>
                <span style={{ fontSize: '12px', color: '#4B5563' }}>1인 분담금 ({capacity}명 기준)</span>
                <span style={{ fontSize: '20px', fontWeight: '900', color: '#2563EB' }}>{Math.round(displayedRoute.fare / capacity).toLocaleString()}원</span>
              </div>
            </div>
          )}
        </div>

        {/* ── 일정 카드 ── */}
        <div style={card}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: '#2563EB', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={13} />
            일정 & 탑승 조건
          </div>

          {/* 출발 시간 */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>출발 시간</label>
            <input
              type="datetime-local"
              value={departureTime}
              onChange={e => setDepartureTime(e.target.value)}
              style={{ ...inputStyle(false), paddingLeft: '14px', paddingRight: '14px' }}
              required
            />
          </div>

          {/* 인원 */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>모집 인원</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[2, 3, 4].map(n => (
                <button
                  key={n} type="button"
                  onClick={() => setCapacity(n)}
                  style={{
                    flex: 1, height: '46px', border: `1.5px solid ${capacity === n ? '#2563EB' : '#E0E7FF'}`,
                    borderRadius: '12px', background: capacity === n ? '#EFF6FF' : '#F8FAFF',
                    color: capacity === n ? '#2563EB' : '#6B7280', fontWeight: capacity === n ? '800' : '600',
                    fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {n}명
                </button>
              ))}
            </div>
          </div>

          {/* 성별 필터 */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>성별 조건</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button" onClick={() => setGenderFilter('anyone')}
                style={{
                  flex: 1, height: '46px', border: `1.5px solid ${genderFilter === 'anyone' ? '#2563EB' : '#E0E7FF'}`,
                  borderRadius: '12px', background: genderFilter === 'anyone' ? '#EFF6FF' : '#F8FAFF',
                  color: genderFilter === 'anyone' ? '#2563EB' : '#6B7280', fontWeight: genderFilter === 'anyone' ? '800' : '600',
                  fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                👥 누구나
              </button>
              <button
                type="button" onClick={() => setGenderFilter('same_gender')}
                style={{
                  flex: 1, height: '46px', border: `1.5px solid ${genderFilter === 'same_gender' ? '#7C3AED' : '#E0E7FF'}`,
                  borderRadius: '12px', background: genderFilter === 'same_gender' ? '#F5F3FF' : '#F8FAFF',
                  color: genderFilter === 'same_gender' ? '#7C3AED' : '#6B7280', fontWeight: genderFilter === 'same_gender' ? '800' : '600',
                  fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {userGender === '남' ? '👨' : '👩'} {userGender}성만
              </button>
            </div>
            {genderFilter === 'same_gender' && (
              <div style={{ marginTop: '8px', padding: '8px 12px', background: '#F5F3FF', borderRadius: '10px', fontSize: '10px', color: '#7C3AED', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={12} />
                {userGender}성 탑승자만 신청 가능합니다
              </div>
            )}
          </div>
        </div>

        {/* ── 정산 카드 ── */}
        <div style={card}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: '#2563EB', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CreditCard size={13} />
            정산 계좌 정보
          </div>

          {/* 은행 + 계좌 */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>계좌 정보</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative', width: '120px', flexShrink: 0 }}>
                <select
                  value={bankName} onChange={e => setBankName(e.target.value)}
                  style={{ width: '100%', height: '46px', padding: '0 28px 0 10px', background: '#F8FAFF', border: '1.5px solid #E0E7FF', borderRadius: '12px', fontSize: '11px', color: '#111827', fontWeight: '600', appearance: 'none', cursor: 'pointer', outline: 'none' }}
                >
                  {BANK_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <ChevronDown size={13} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
              </div>
              <input
                type="text" value={accountNumber}
                onChange={e => setAccountNumber(e.target.value.replace(/[^0-9-]/g, ''))}
                placeholder="계좌번호 (- 포함)"
                style={{ flex: 1, height: '46px', padding: '0 12px', background: '#F8FAFF', border: '1.5px solid #E0E7FF', borderRadius: '12px', fontSize: '12px', color: '#111827', outline: 'none', boxSizing: 'border-box' }}
                required
              />
            </div>
          </div>

          {/* 카카오페이 */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
              카카오페이 링크 <span style={{ fontWeight: '400', color: '#9CA3AF' }}>(선택)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Link2 size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input
                type="url" value={kakaopayUrl} onChange={e => setKakaopayUrl(e.target.value)}
                placeholder="https://qr.kakaopay.com/..."
                style={{ width: '100%', height: '46px', paddingLeft: '34px', paddingRight: '12px', background: '#F8FAFF', border: '1.5px solid #E0E7FF', borderRadius: '12px', fontSize: '12px', color: '#111827', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <p style={{ marginTop: '6px', fontSize: '10px', color: '#9CA3AF', lineHeight: 1.4 }}>
              카카오페이 QR 링크를 넣으면 탑승자들이 바로 송금할 수 있어요
            </p>
          </div>
        </div>

        {/* ── 제출 버튼 ── */}
        <div style={{ padding: '0 14px 14px' }}>
          <button
            type="submit" disabled={loading}
            style={{
              width: '100%', height: '52px',
              background: loading ? '#93C5FD' : 'linear-gradient(135deg, #1D4ED8, #3B82F6)',
              border: 'none', borderRadius: '16px',
              color: '#FFF', fontSize: '15px', fontWeight: '800',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 6px 20px rgba(37,99,235,0.35)',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            {loading ? (
              <>
                <span style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#FFF', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                방 만드는 중...
              </>
            ) : '🚕 방 개설하기'}
          </button>
        </div>

      </form>
    </div>
  );
}

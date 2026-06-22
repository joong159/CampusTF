'use client';

import { useState, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import KakaoMap, { getRouteDetails, getCoordinates, LANDMARK_COORDS } from '@/components/KakaoMap';
import { ArrowLeft, MapPin, Clock, Users, ShieldAlert, CreditCard, Link, Landmark, Search, X } from 'lucide-react';

// Preset locations for quick selection / fallback
const PRESET_LOCATIONS = [
  { name: '대진대역 1번출구', lat: 37.875184, lng: 127.156525 },
  { name: '대진대 정문',     lat: 37.896245, lng: 127.186847 },
  { name: '대진대 공학관',   lat: 37.899120, lng: 127.183492 },
  { name: '포천터미널',      lat: 37.894812, lng: 127.206691 },
  { name: '의정부역',        lat: 37.738411, lng: 127.045934 },
];

export default function CreateRoom({ user, onBack, onRoomCreated }) {
  // --- Location state ---
  // `departure`/`destination`: the value stored in DB. Either a preset name or "장소명|lat,lng"
  const [departure, setDeparture]       = useState('대진대역 1번출구');
  const [destination, setDestination]   = useState('대진대 정문');
  // Display strings inside the text inputs
  const [departureInput, setDepartureInput]   = useState('대진대역 1번출구');
  const [destinationInput, setDestinationInput] = useState('대진대 정문');
  // Suggestion lists
  const [departureSuggestions, setDepartureSuggestions]   = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  const [showDepSuggestions, setShowDepSuggestions]   = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  // Async route info from KakaoMap callback
  const [routeInfo, setRouteInfo] = useState(null);

  // --- Form state ---
  const [departureTime, setDepartureTime] = useState('');
  const [capacity, setCapacity]           = useState(4);
  const [genderFilter, setGenderFilter]   = useState('anyone');
  const [bankName, setBankName]           = useState('국민은행');
  const [accountNumber, setAccountNumber] = useState('');
  const [kakaopayUrl, setKakaopayUrl]     = useState('');
  const [loading, setLoading]             = useState(false);

  const bankOptions = ['국민은행', '신한은행', '우리은행', '하나은행', '카카오뱅크', '토스뱅크', '농협'];

  // Debounce refs
  const depDebounceRef  = useRef(null);
  const destDebounceRef = useRef(null);

  // ----- Autocomplete fetcher -----
  const fetchSuggestions = useCallback((query, isDeparture) => {
    const setSuggestions = isDeparture ? setDepartureSuggestions : setDestinationSuggestions;

    // Empty query → show preset quick-picks
    if (!query.trim()) {
      setSuggestions(PRESET_LOCATIONS);
      return;
    }

    // Try Kakao Maps Places SDK first
    if (
      typeof window !== 'undefined' &&
      window.kakao &&
      window.kakao.maps &&
      window.kakao.maps.services
    ) {
      const ps = new window.kakao.maps.services.Places();
      ps.keywordSearch(query, (data, status) => {
        if (status === window.kakao.maps.services.Status.OK) {
          const results = data.slice(0, 6).map((item) => ({
            name: item.place_name,
            address: item.road_address_name || item.address_name,
            lat: parseFloat(item.y),
            lng: parseFloat(item.x),
          }));
          setSuggestions(results);
        } else {
          // SDK returned no results → fallback to local filter
          const filtered = PRESET_LOCATIONS.filter((p) =>
            p.name.includes(query)
          );
          setSuggestions(filtered);
        }
      });
    } else {
      // SDK not loaded → local fallback
      const filtered = PRESET_LOCATIONS.filter((p) => p.name.includes(query));
      setSuggestions(filtered.length > 0 ? filtered : PRESET_LOCATIONS);
    }
  }, []);

  // ----- Input change handlers -----
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

  // ----- Suggestion select -----
  const selectDeparture = (item) => {
    const value = item.lng
      ? `${item.name}|${item.lat},${item.lng}`
      : item.name;
    // If it's a pure preset name (no custom coords needed), store just the name
    const isPreset = PRESET_LOCATIONS.some(p => p.name === item.name);
    setDeparture(isPreset ? item.name : value);
    setDepartureInput(item.name);
    setDepartureSuggestions([]);
    setShowDepSuggestions(false);
    setRouteInfo(null); // reset until KakaoMap fires callback
  };

  const selectDestination = (item) => {
    const value = item.lng
      ? `${item.name}|${item.lat},${item.lng}`
      : item.name;
    const isPreset = PRESET_LOCATIONS.some(p => p.name === item.name);
    setDestination(isPreset ? item.name : value);
    setDestinationInput(item.name);
    setDestinationSuggestions([]);
    setShowDestSuggestions(false);
    setRouteInfo(null);
  };

  const clearDep = () => {
    setDeparture('');
    setDepartureInput('');
    setDepartureSuggestions([]);
    setShowDepSuggestions(false);
    setRouteInfo(null);
  };

  const clearDest = () => {
    setDestination('');
    setDestinationInput('');
    setDestinationSuggestions([]);
    setShowDestSuggestions(false);
    setRouteInfo(null);
  };

  // ----- Form submit -----
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!departure || !destination) {
      alert('출발지와 목적지를 입력해주세요.');
      return;
    }
    if (departure === destination) {
      alert('출발지와 목적지가 동일합니다. 다르게 지정해 주세요.');
      return;
    }
    if (!departureTime) {
      alert('출발 시간을 선택해주세요.');
      return;
    }
    if (!accountNumber) {
      alert('정산용 계좌번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const roomData = {
        departure,
        destination,
        departure_time: new Date(departureTime).toISOString(),
        capacity: parseInt(capacity),
        gender_filter: genderFilter,
        bank_account: `${bankName} ${accountNumber.trim()}`,
        kakaopay_url: kakaopayUrl.trim() || null,
      };

      const { data, error } = await api.rooms.create(roomData, user.id);
      if (error) throw error;
      alert('택시 동승 방이 성공적으로 생성되었습니다!');
      onRoomCreated(data.id);
    } catch (err) {
      alert(err.message || '방 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // ----- Computed fare for banner -----
  const getDisplayedRouteInfo = () => {
    if (routeInfo) return routeInfo; // async from KakaoMap (highest quality)
    if (departure && destination && departure !== destination) {
      return getRouteDetails(departure, destination); // sync fallback
    }
    return null;
  };
  const displayedRoute = getDisplayedRouteInfo();

  return (
    <div className="flex flex-col flex-1 bg-theme-emulator text-theme-text-primary transition-colors duration-300">
      {/* Top Header */}
      <header className="sticky top-0 bg-theme-header backdrop-blur-md border-b border-theme-header-border px-4 py-3.5 flex items-center gap-3 z-10 transition-colors">
        <button
          onClick={onBack}
          className="w-9 h-9 bg-theme-panel border border-theme-border hover:bg-theme-panel/70 rounded-full flex items-center justify-center text-theme-text-secondary hover:text-theme-text-primary transition-colors cursor-pointer"
          style={{ minHeight: '36px', minWidth: '36px' }}
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-sm font-black text-theme-text-primary transition-colors">택시 팟 만들기</h1>
      </header>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-4 space-y-6 flex-1 overflow-y-auto bg-theme-emulator transition-colors">
        {/* Route Section */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-theme-text-muted tracking-wider uppercase ml-1 transition-colors">📍 출발 및 도착 정보</h3>

          {/* Departure Autocomplete */}
          <div>
            <label className="block text-xs font-bold text-theme-text-secondary mb-2 ml-1 transition-colors">출발지</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-theme-text-muted transition-colors pointer-events-none z-10">
                <MapPin size={16} className="text-blue-500" />
              </span>
              <input
                type="text"
                value={departureInput}
                onChange={handleDepInput}
                onFocus={() => {
                  setShowDepSuggestions(true);
                  fetchSuggestions(departureInput, true);
                }}
                onBlur={() => setTimeout(() => setShowDepSuggestions(false), 180)}
                placeholder="장소명 검색 (예: 포천, 의정부역...)"
                className="w-full pl-10 pr-10 py-3 bg-theme-input border border-theme-input-border rounded-2xl text-xs focus:outline-none focus:border-theme-input-focus focus:bg-theme-input focus:shadow-glow-blue text-theme-text-primary placeholder-theme-text-muted/65 transition-all"
                style={{ minHeight: '44px' }}
                autoComplete="off"
              />
              {departureInput ? (
                <button type="button" onClick={clearDep} className="absolute inset-y-0 right-3 flex items-center text-theme-text-muted hover:text-theme-text-primary transition-colors cursor-pointer z-10">
                  <X size={14} />
                </button>
              ) : (
                <span className="absolute inset-y-0 right-3 flex items-center text-theme-text-muted pointer-events-none z-10">
                  <Search size={14} />
                </span>
              )}

              {/* Departure Suggestion Dropdown */}
              {showDepSuggestions && departureSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-theme-panel border border-theme-border rounded-2xl shadow-xl z-50 overflow-hidden animate-fade-in max-h-52 overflow-y-auto">
                  {!departureInput && (
                    <div className="px-3 py-2 text-[9px] font-black text-theme-text-muted uppercase tracking-wider border-b border-theme-border">
                      🏫 자주 가는 추천 거점
                    </div>
                  )}
                  {departureSuggestions.map((item, i) => (
                    <button
                      key={i}
                      type="button"
                      onMouseDown={() => selectDeparture(item)}
                      className="w-full text-left px-4 py-3 hover:bg-theme-input transition-colors border-b border-theme-border/50 last:border-none cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin size={12} className="text-blue-400 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-theme-text-primary">{item.name}</p>
                          {item.address && (
                            <p className="text-[10px] text-theme-text-muted mt-0.5">{item.address}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Destination Autocomplete */}
          <div>
            <label className="block text-xs font-bold text-theme-text-secondary mb-2 ml-1 transition-colors">목적지</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-theme-text-muted transition-colors pointer-events-none z-10">
                <MapPin size={16} className="text-red-500" />
              </span>
              <input
                type="text"
                value={destinationInput}
                onChange={handleDestInput}
                onFocus={() => {
                  setShowDestSuggestions(true);
                  fetchSuggestions(destinationInput, false);
                }}
                onBlur={() => setTimeout(() => setShowDestSuggestions(false), 180)}
                placeholder="목적지 검색 (예: 의정부역, 서울역...)"
                className="w-full pl-10 pr-10 py-3 bg-theme-input border border-theme-input-border rounded-2xl text-xs focus:outline-none focus:border-theme-input-focus focus:bg-theme-input focus:shadow-glow-blue text-theme-text-primary placeholder-theme-text-muted/65 transition-all"
                style={{ minHeight: '44px' }}
                autoComplete="off"
              />
              {destinationInput ? (
                <button type="button" onClick={clearDest} className="absolute inset-y-0 right-3 flex items-center text-theme-text-muted hover:text-theme-text-primary transition-colors cursor-pointer z-10">
                  <X size={14} />
                </button>
              ) : (
                <span className="absolute inset-y-0 right-3 flex items-center text-theme-text-muted pointer-events-none z-10">
                  <Search size={14} />
                </span>
              )}

              {/* Destination Suggestion Dropdown */}
              {showDestSuggestions && destinationSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-theme-panel border border-theme-border rounded-2xl shadow-xl z-50 overflow-hidden animate-fade-in max-h-52 overflow-y-auto">
                  {!destinationInput && (
                    <div className="px-3 py-2 text-[9px] font-black text-theme-text-muted uppercase tracking-wider border-b border-theme-border">
                      🏫 자주 가는 추천 거점
                    </div>
                  )}
                  {destinationSuggestions.map((item, i) => (
                    <button
                      key={i}
                      type="button"
                      onMouseDown={() => selectDestination(item)}
                      className="w-full text-left px-4 py-3 hover:bg-theme-input transition-colors border-b border-theme-border/50 last:border-none cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin size={12} className="text-red-400 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-theme-text-primary">{item.name}</p>
                          {item.address && (
                            <p className="text-[10px] text-theme-text-muted mt-0.5">{item.address}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Map Preview */}
          {(departure || destination) && (
            <div className="space-y-2 pt-1 animate-fade-in">
              <span className="block text-[10px] font-black text-theme-text-muted ml-1 uppercase tracking-wide transition-colors">경로 지도 프리뷰</span>
              <KakaoMap
                departure={departure}
                destination={destination}
                onRouteInfoUpdate={(info) => setRouteInfo(info)}
              />
              <button
                type="button"
                onClick={() => {
                  const depC = getCoordinates(departure, LANDMARK_COORDS.station);
                  const destC = getCoordinates(destination, LANDMARK_COORDS.main_gate);
                  const depName = departureInput || departure;
                  const destName = destinationInput || destination;
                  const url = `https://map.kakao.com/link/route/${encodeURIComponent(depName)},${depC.lat},${depC.lng},${encodeURIComponent(destName)},${destC.lat},${destC.lng}`;
                  window.open(url, '_blank');
                }}
                className="w-full py-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-950 text-[10px] font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                style={{ minHeight: '32px' }}
              >
                🚕 카카오 T 앱으로 경로 확인하기
              </button>
            </div>
          )}

          {/* Pre-ride Taxi Fare & N/1 Cost Estimator Banner */}
          {departure && destination && departure !== destination && displayedRoute && (
            <div className="bg-gradient-to-br from-theme-blue/15 to-purple-500/[0.04] border border-theme-blue/25 rounded-3xl p-5 shadow-sm space-y-3 animate-fade-in transition-colors">
              <div className="flex items-center gap-1.5 text-[10px] font-black text-theme-blue uppercase tracking-wider transition-colors">
                <Landmark size={14} />
                <span>예상 요금 및 1/N 예상액</span>
                {routeInfo && (
                  <span className="ml-auto text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    실시간 계산
                  </span>
                )}
              </div>

              <div className="flex justify-between text-xs text-theme-text-secondary font-semibold transition-colors">
                <span>이동 거리: <strong className="text-theme-text-primary">{displayedRoute.distance}</strong></span>
                <span>예상 총 택시비: <strong className="text-theme-text-primary">{displayedRoute.fare.toLocaleString()}원</strong></span>
              </div>

              <div className="flex justify-between items-center pt-2.5 text-xs border-t border-theme-border font-semibold transition-colors">
                <span className="text-theme-text-secondary">1인당 분담금 ({capacity}명 모집 시):</span>
                <span className="text-base font-black text-red-500">
                  {Math.round(displayedRoute.fare / capacity).toLocaleString()}원
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Departure Time & Capacity */}
        <div className="grid grid-cols-2 gap-4">
          {/* Time */}
          <div>
            <label className="block text-xs font-bold text-theme-text-secondary mb-2 ml-1 transition-colors">출발 시간</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-theme-text-muted transition-colors pointer-events-none z-10">
                <Clock size={15} />
              </span>
              <input
                type="datetime-local"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="w-full pl-9 pr-2 py-3 bg-theme-input border border-theme-input-border rounded-2xl text-[10px] focus:outline-none focus:border-theme-input-focus focus:bg-theme-input focus:shadow-glow-blue text-theme-text-primary transition-all cursor-pointer"
                style={{ minHeight: '44px' }}
                required
              />
            </div>
          </div>

          {/* Capacity */}
          <div>
            <label className="block text-xs font-bold text-theme-text-secondary mb-2 ml-1 transition-colors">모집 인원 (정원)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-theme-text-muted transition-colors pointer-events-none z-10">
                <Users size={15} />
              </span>
              <select
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-theme-input border border-theme-input-border rounded-2xl text-xs focus:outline-none focus:border-theme-input-focus focus:bg-theme-input focus:shadow-glow-blue text-theme-text-primary placeholder-theme-text-muted/65 transition-all appearance-none cursor-pointer"
                style={{ minHeight: '44px' }}
              >
                <option value={2} className="bg-theme-emulator text-theme-text-primary">2명</option>
                <option value={3} className="bg-theme-emulator text-theme-text-primary">3명</option>
                <option value={4} className="bg-theme-emulator text-theme-text-primary">4명</option>
              </select>
            </div>
          </div>
        </div>

        {/* Gender Filter Option */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-theme-text-secondary mb-2 ml-1 transition-colors">성별 필터 옵션</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setGenderFilter('anyone')}
              className={`py-3.5 text-center text-xs font-bold rounded-2xl border transition-all cursor-pointer ${
                genderFilter === 'anyone'
                  ? 'border-theme-input-focus bg-theme-blue-light text-theme-blue shadow-sm font-black'
                  : 'border-theme-input-border bg-theme-input text-theme-text-secondary hover:bg-theme-panel'
              }`}
              style={{ minHeight: '44px' }}
            >
              누구나 (성별 무관)
            </button>
            <button
              type="button"
              onClick={() => setGenderFilter('same_gender')}
              className={`py-3.5 text-center text-xs font-bold rounded-2xl border transition-all cursor-pointer ${
                genderFilter === 'same_gender'
                  ? 'border-purple-500 bg-purple-500/10 text-purple-600 shadow-sm font-black'
                  : 'border-theme-input-border bg-theme-input text-theme-text-secondary hover:bg-theme-panel'
              }`}
              style={{ minHeight: '44px' }}
            >
              동성끼리만 ({user.user_metadata.gender}자만)
            </button>
          </div>
          <p className="text-[10px] text-theme-text-muted mt-1.5 leading-relaxed flex items-start gap-1 transition-colors">
            <ShieldAlert size={12} className="text-theme-text-muted mt-0.5 shrink-0 animate-pulse transition-colors" />
            <span>
              [동성끼리만] 선택 시, 귀하({user.user_metadata.gender === '남' ? '남성' : '여성'})와 성별이 동일한 학우들만 참여 신청 및 수락할 수 있습니다.
            </span>
          </p>
        </div>

        {/* Account Info for Settlement */}
        <div className="space-y-4 pt-2">
          <h3 className="text-[10px] font-black text-theme-text-muted tracking-wider uppercase ml-1 transition-colors">💳 정산/송금 정보 설정</h3>

          <div className="grid grid-cols-3 gap-2">
            {/* Bank Select */}
            <div className="col-span-1">
              <label className="block text-xs font-bold text-theme-text-secondary mb-2 ml-1 transition-colors">은행</label>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-2 py-3 bg-theme-input border border-theme-input-border rounded-2xl text-xs focus:outline-none focus:border-theme-input-focus text-theme-text-primary transition-all appearance-none cursor-pointer"
                style={{ minHeight: '44px' }}
              >
                {bankOptions.map(b => (
                  <option key={b} value={b} className="bg-theme-emulator text-theme-text-primary">{b}</option>
                ))}
              </select>
            </div>

            {/* Account Number */}
            <div className="col-span-2">
              <label className="block text-xs font-bold text-theme-text-secondary mb-2 ml-1 transition-colors">계좌번호</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-theme-text-muted pointer-events-none z-10 transition-colors">
                  <CreditCard size={15} />
                </span>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9-]/g, ''))}
                  placeholder="- 포함 입력"
                  className="w-full pl-9 pr-3 py-3 bg-theme-input border border-theme-input-border rounded-2xl text-xs focus:outline-none focus:border-theme-input-focus focus:bg-theme-input focus:shadow-glow-blue text-theme-text-primary transition-all placeholder-theme-text-muted/60"
                  style={{ minHeight: '44px' }}
                  required
                />
              </div>
            </div>
          </div>

          {/* KakaoPay Remittance Link */}
          <div>
            <label className="block text-xs font-bold text-theme-text-secondary mb-2 ml-1 transition-colors">
              카카오페이 송금 링크 <span className="text-theme-text-muted font-normal">(선택)</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-theme-text-muted z-10 transition-colors">
                <Link size={15} />
              </span>
              <input
                type="url"
                value={kakaopayUrl}
                onChange={(e) => setKakaopayUrl(e.target.value)}
                placeholder="https://qr.kakaopay.com/..."
                className="w-full pl-10 pr-4 py-3 bg-theme-input border border-theme-input-border rounded-2xl text-xs focus:outline-none focus:border-theme-input-focus focus:bg-theme-input focus:shadow-glow-blue text-theme-text-primary transition-all placeholder-theme-text-muted/60"
                style={{ minHeight: '44px' }}
              />
            </div>
            <p className="text-[9px] text-theme-text-muted mt-1 leading-normal transition-colors">
              카카오페이 QR 송금 코드의 상세 정보에서 링크 주소를 복사해 넣으면, 탑승자들이 클릭 한번으로 페이 송금을 진행할 수 있습니다.
            </p>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-gradient-to-r from-[#003893] to-blue-600 hover:from-blue-700 hover:to-blue-500 text-white text-xs font-bold rounded-2xl transition-all shadow-sm active:scale-[0.98] disabled:bg-theme-input-border disabled:text-theme-text-muted disabled:scale-100 flex items-center justify-center gap-2 cursor-pointer mb-8"
          style={{ minHeight: '46px' }}
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          ) : (
            '방 개설하기'
          )}
        </button>
      </form>
    </div>
  );
}

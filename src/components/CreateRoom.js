'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import NaverMap, { getRouteDetails } from '@/components/NaverMap';
import { ArrowLeft, MapPin, Clock, Users, ShieldAlert, CreditCard, Link, Landmark } from 'lucide-react';

export default function CreateRoom({ user, onBack, onRoomCreated }) {
  const [departure, setDeparture] = useState('대진대역 1번출구');
  const [destination, setDestination] = useState('대진대 정문');
  const [departureTime, setDepartureTime] = useState('');
  const [capacity, setCapacity] = useState(4);
  const [genderFilter, setGenderFilter] = useState('anyone');
  const [bankName, setBankName] = useState('국민은행');
  const [accountNumber, setAccountNumber] = useState('');
  const [kakaopayUrl, setKakaopayUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const bankOptions = ['국민은행', '신한은행', '우리은행', '하나은행', '카카오뱅크', '토스뱅크', '농협'];

  // Preset location dropdown options
  const locations = [
    '대진대역 1번출구',
    '대진대 정문',
    '대진대 공학관',
    '포천터미널',
    '의정부역'
  ];

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

  return (
    <div className="flex flex-col flex-1 bg-white">
      {/* Top Header */}
      <header className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3.5 flex items-center gap-3 z-10">
        <button
          onClick={onBack}
          className="w-10 h-10 hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-700 transition-colors"
          style={{ minHeight: '48px', minWidth: '48px' }}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-gray-800">택시 팟 만들기</h1>
      </header>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-4 space-y-6 flex-1 overflow-y-auto">
        {/* Route Section */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-gray-400 tracking-wider uppercase">📍 출발 및 도착 정보</h3>
          
          {/* Departure */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">출발지</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 pointer-events-none z-10">
                <MapPin size={18} className="text-blue-500" />
              </span>
              <select
                value={departure}
                onChange={(e) => setDeparture(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#003893] focus:bg-white text-gray-800 appearance-none"
                style={{ minHeight: '48px' }}
              >
                {locations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Destination */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">목적지</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 pointer-events-none z-10">
                <MapPin size={18} className="text-red-500" />
              </span>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#003893] focus:bg-white text-gray-800 appearance-none"
                style={{ minHeight: '48px' }}
              >
                {locations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Map Preview */}
          {(departure || destination) && (
            <div className="space-y-1.5 pt-1 animate-fade-in">
              <span className="block text-xs font-bold text-gray-700 ml-1">경로 지도 프리뷰</span>
              <NaverMap departure={departure} destination={destination} />
            </div>
          )}

          {/* Pre-ride Taxi Fare & N/1 Cost Estimator Banner */}
          {departure && destination && departure !== destination && (
            <div className="bg-blue-50 border border-blue-150 rounded-2xl p-4 space-y-2.5 animate-fade-in shadow-sm">
              <div className="flex items-center gap-1.5 text-xs font-black text-[#003893] uppercase tracking-wider">
                <Landmark size={14} />
                예상 요금 및 1/N 예상액
              </div>
              
              <div className="flex justify-between text-xs text-gray-600">
                <span>이동 거리: <strong>{getRouteDetails(departure, destination).distance}</strong></span>
                <span>예상 총 택시비: <strong className="text-gray-800 font-bold">{getRouteDetails(departure, destination).fare.toLocaleString()}원</strong></span>
              </div>
              
              <div className="flex justify-between items-center pt-2 text-xs border-t border-blue-200/50">
                <span className="font-semibold text-gray-700">1인당 분담금 ({capacity}명 모집 시):</span>
                <span className="text-base font-black text-red-500">
                  {Math.round(getRouteDetails(departure, destination).fare / capacity).toLocaleString()}원
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Departure Time & Capacity */}
        <div className="grid grid-cols-2 gap-4">
          {/* Time */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">출발 시간</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 pointer-events-none">
                <Clock size={16} />
              </span>
              <input
                type="datetime-local"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="w-full pl-9 pr-2 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-[#003893] focus:bg-white text-gray-800"
                style={{ minHeight: '48px' }}
                required
              />
            </div>
          </div>

          {/* Capacity */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">모집 인원 (정원)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 pointer-events-none">
                <Users size={16} />
              </span>
              <select
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#003893] focus:bg-white text-gray-800 appearance-none"
                style={{ minHeight: '48px' }}
              >
                <option value={2}>2명</option>
                <option value={3}>3명</option>
                <option value={4}>4명</option>
              </select>
            </div>
          </div>
        </div>

        {/* Gender Filter Option */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">성별 필터 옵션</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setGenderFilter('anyone')}
              className={`py-3.5 text-center text-sm font-semibold rounded-xl border transition-all ${
                genderFilter === 'anyone'
                  ? 'border-[#003893] bg-[#EBF2FF] text-[#003893] font-bold shadow-sm'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
              style={{ minHeight: '48px' }}
            >
              누구나 (성별 무관)
            </button>
            <button
              type="button"
              onClick={() => setGenderFilter('same_gender')}
              className={`py-3.5 text-center text-sm font-semibold rounded-xl border transition-all ${
                genderFilter === 'same_gender'
                  ? 'border-purple-600 bg-purple-50 text-purple-600 font-bold shadow-sm'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
              style={{ minHeight: '48px' }}
            >
              동성끼리만 ({user.user_metadata.gender}자만)
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed flex items-start gap-1">
            <ShieldAlert size={12} className="text-gray-400 mt-0.5 shrink-0" />
            <span>
              [동성끼리만] 선택 시, 귀하({user.user_metadata.gender === '남' ? '남성' : '여성'})와 성별이 동일한 학우들만 참여 신청 및 수락할 수 있습니다.
            </span>
          </p>
        </div>

        {/* Account Info for Settlement */}
        <div className="space-y-4 pt-2">
          <h3 className="text-xs font-black text-gray-400 tracking-wider uppercase">💳 정산/송금 정보 설정</h3>
          
          <div className="grid grid-cols-3 gap-2">
            {/* Bank Select */}
            <div className="col-span-1">
              <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">은행</label>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-2 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-[#003893] text-gray-800 appearance-none"
                style={{ minHeight: '48px' }}
              >
                {bankOptions.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            
            {/* Account Number */}
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">계좌번호</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 pointer-events-none">
                  <CreditCard size={16} />
                </span>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9-]/g, ''))}
                  placeholder="- 포함 입력"
                  className="w-full pl-9 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#003893] text-gray-800"
                  style={{ minHeight: '48px' }}
                  required
                />
              </div>
            </div>
          </div>

          {/* KakaoPay Remittance Link */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">
              카카오페이 송금 링크 <span className="text-gray-400 font-normal">(선택)</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                <Link size={16} />
              </span>
              <input
                type="url"
                value={kakaopayUrl}
                onChange={(e) => setKakaopayUrl(e.target.value)}
                placeholder="https://qr.kakaopay.com/..."
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#003893] text-gray-800"
                style={{ minHeight: '48px' }}
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              카카오페이 QR 송금 코드의 상세 정보에서 링크 주소를 복사해 넣으면, 탑승자들이 클릭 한번으로 페이 송금을 진행할 수 있습니다.
            </p>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-[#003893] hover:bg-[#002a70] text-white text-sm font-bold rounded-xl transition-all shadow-md active:scale-[0.98] disabled:bg-gray-300 disabled:scale-100 flex items-center justify-center gap-2"
          style={{ minHeight: '48px' }}
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

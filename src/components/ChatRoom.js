
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import KakaoMap, { getCoordinates, LANDMARK_COORDS, getDisplayLocation, getRouteDetails, calculateDistance, calcTaxiFare } from '@/components/KakaoMap';
import {
  ArrowLeft, Send, AlertTriangle, Landmark,
  ChevronRight, Calculator, Check, Copy, ExternalLink, RefreshCw, UserCheck
} from 'lucide-react';

// Calculate segment fares based on midway boarding
const calculateSegmentFares = (totalFare, departure, destination, midwayBoardersCount, totalRidersCount) => {
  const depC = getCoordinates(departure, LANDMARK_COORDS.station);
  const destC = getCoordinates(destination, LANDMARK_COORDS.main_gate);
  const midC = LANDMARK_COORDS.main_gate; // Midway point: 대진대 정문

  // Calculate total distance between start and end
  const totalDist = Math.sqrt(Math.pow(depC.lat - destC.lat, 2) + Math.pow(depC.lng - destC.lng, 2));

  // Calculate distance from midway (Main Gate) to destination
  const segment2Dist = Math.sqrt(Math.pow(midC.lat - destC.lat, 2) + Math.pow(midC.lng - destC.lng, 2));

  // Guard: if midway is too close to start or end, or if total distance is tiny, just do a flat 50/50 distance split
  let s2Ratio = 0.25; // Default: midway boarder rides 25% of the total distance
  if (totalDist > 0.001 && segment2Dist < totalDist) {
    s2Ratio = segment2Dist / totalDist;
  }

  const fare2 = totalFare * s2Ratio;
  const fare1 = totalFare - fare2;

  const numStart = totalRidersCount - midwayBoardersCount;
  const numTotal = totalRidersCount;

  const startShare = (fare1 / numStart) + (fare2 / numTotal);
  const midwayShare = fare2 / numTotal;

  return {
    startShare: Math.round(startShare / 10) * 10, // Round to nearest 10 won
    midwayShare: Math.round(midwayShare / 10) * 10,
    fare1: Math.round(fare1),
    fare2: Math.round(fare2)
  };
};

export default function ChatRoom({ user, roomId, onBack, onGoToManage }) {
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [participantsCount, setParticipantsCount] = useState(1);
  const [isFareModalOpen, setIsFareModalOpen] = useState(false);
  const [totalFareInput, setTotalFareInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showMap, setShowMap] = useState(true); // Default map expanded
  const [myStatus, setMyStatus] = useState('none'); // 'none', 'pending', 'accepted', 'rejected'
  const [acceptedApplicants, setAcceptedApplicants] = useState([]);
  const [midwayBoarders, setMidwayBoarders] = useState({}); // userId -> boolean
  const [guestIsMidway, setGuestIsMidway] = useState(false);
  const [applyingMidway, setApplyingMidway] = useState(false); // midway toggle on application banner

  // Route modal state
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [routeDep, setRouteDep] = useState(null); // { name, lat, lng }
  const [routeDest, setRouteDest] = useState(null); // { name, lat, lng }
  const [depSearchInput, setDepSearchInput] = useState('');
  const [destSearchInput, setDestSearchInput] = useState('');
  const [depResults, setDepResults] = useState([]);
  const [destResults, setDestResults] = useState([]);

  const chatContainerRef = useRef(null);

  const fetchRoomData = useCallback(async () => {
    try {
      const roomsList = await api.rooms.list();
      const currentRoom = roomsList.find(r => r.id === roomId);
      setRoom(currentRoom);

      if (currentRoom) {
        setParticipantsCount(currentRoom.participant_count);

        const apps = await api.applicants.list(roomId);
        const myApp = apps.find(a => a.user_id === user.id);
        setMyStatus(myApp ? myApp.status : 'none');

        // Fetch accepted applicants
        const accepted = apps.filter(a => a.status === 'accepted');
        setAcceptedApplicants(accepted);
      }

      const msgs = await api.chats.list(roomId);
      setMessages(msgs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [roomId, user.id]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchRoomData();
    }, 0);

    // Subscribe to realtime messages & room updates
    const unsubscribe = api.chats.subscribe(
      roomId,
      (newMsgsOrUpdater) => {
        if (typeof newMsgsOrUpdater === 'function') {
          setMessages(newMsgsOrUpdater);
        } else {
          setMessages(newMsgsOrUpdater);
        }
      },
      (updatedRoom) => {
        setRoom(prev => prev ? { ...prev, ...updatedRoom } : updatedRoom);
      }
    );

    // Poll room data periodically to sync applicant status
    const pollInterval = setInterval(fetchRoomData, 2500);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
      clearInterval(pollInterval);
    };
  }, [roomId, fetchRoomData]);

  // Scroll to bottom when messages load/change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    try {
      await api.chats.send(roomId, user.id, inputValue.trim());
      setInputValue('');
    } catch (err) {
      console.error('Send error:', err);
    }
  };

  const handleApply = async () => {
    if (!room) return;

    if (room.gender_filter === 'same_gender' && room.host.gender !== user.user_metadata.gender) {
      alert(`이 방은 [동성끼리만(${room.host.gender}성)] 방이므로 참여할 수 없습니다.`);
      return;
    }

    const midwayNote = applyingMidway ? ' [중간 합류 - 대진대 정문 탑승]' : '';
    const confirmJoin = window.confirm(`이 택시 팟에 동승 참여를 신청하시겠습니까?${midwayNote}`);
    if (!confirmJoin) return;

    try {
      const { error } = await api.applicants.apply(roomId, user.id);
      if (error) throw error;

      // Send automatic system message to notify host of midway boarding
      if (applyingMidway) {
        const studentId = user.user_metadata?.student_id || user.email?.split('@')[0] || '학생';
        const systemMsg = `🙋‍♂️ 학번 ${studentId}님이 [중간 합류]로 신청했습니다 (정문 탑승).`;
        await api.chats.send(roomId, user.id, systemMsg);
      }

      alert('신청이 성공적으로 접수되었습니다! 방장의 참여 수락을 기다리는 중입니다.');
      fetchRoomData();
    } catch (err) {
      alert(err.message || '신청 중 오류가 발생했습니다.');
    }
  };


  const handleCopyAccount = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.bank_account);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 경로 검색 모달 열기 (방 기본 출발지/목적지로 초기화)
  const openRouteModal = () => {
    if (!room) return;
    const depC = getCoordinates(room.departure, LANDMARK_COORDS.station);
    const destC = getCoordinates(room.destination, LANDMARK_COORDS.main_gate);
    const depName = getDisplayLocation(room.departure);
    const destName = getDisplayLocation(room.destination);
    setRouteDep({ name: depName, lat: depC.lat, lng: depC.lng });
    setRouteDest({ name: destName, lat: destC.lat, lng: destC.lng });
    setDepSearchInput(depName);
    setDestSearchInput(destName);
    setDepResults([]);
    setDestResults([]);
    setShowRouteModal(true);
  };

  // 카카오 장소 검색 API 호출
  const searchKakaoPlaces = (keyword, setResults) => {
    if (!keyword.trim()) { setResults([]); return; }
    if (!window.kakao?.maps?.services) {
      alert('카카오 지도 API를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    const places = new window.kakao.maps.services.Places();
    places.keywordSearch(keyword, (result, status) => {
      if (status === window.kakao.maps.services.Status.OK) {
        setResults(result.slice(0, 5).map(p => ({
          name: p.place_name,
          address: p.road_address_name || p.address_name,
          lat: parseFloat(p.y),
          lng: parseFloat(p.x),
        })));
      } else {
        setResults([]);
        alert('검색 결과가 없습니다. 다른 검색어를 입력해보세요.');
      }
    });
  };

  // 카카오맵 공식 URL 포맷으로 경로 열기
  // 참고: https://apis.map.kakao.com/web/guide/#routeurl
  const confirmRoute = () => {
    if (!routeDep || !routeDest) return;
    const url = `https://map.kakao.com/link/from/${routeDep.name},${routeDep.lat},${routeDep.lng}/to/${routeDest.name},${routeDest.lat},${routeDest.lng}`;
    window.open(url, '_blank');
    setShowRouteModal(false);
  };

  // State Management actions
  const advanceState = async () => {
    if (!room) return;

    try {
      if (room.status === 'recruiting') {
        const confirmClose = window.confirm('모집을 마감하시겠습니까? 더 이상 신청을 받을 수 없습니다.');
        if (confirmClose) {
          await api.rooms.updateStatus(roomId, 'closed');
          alert('모집이 마감되었습니다.');
          fetchRoomData();
        }
      } else if (room.status === 'closed') {
        const confirmRide = window.confirm('택시에 탑승하여 출발하셨습니까? 탑승 상태로 변경합니다.');
        if (confirmRide) {
          await api.rooms.updateStatus(roomId, 'riding');
          alert('운행이 시작되었습니다. 안전한 이동 되세요!');
          fetchRoomData();
        }
      } else if (room.status === 'riding') {
        setIsFareModalOpen(true);
      }
    } catch (err) {
      alert(err.message || '상태 업데이트 실패');
    }
  };

  const getGuestShare = () => {
    if (!room || !room.total_fare || !participantsCount) return 0;

    // Check if we can parse from system messages
    const systemMsg = messages.find(m => m.content && m.content.includes('방장이 정산 요청을 등록했습니다.'));
    if (systemMsg) {
      if (guestIsMidway) {
        const match = systemMsg.content.match(/중간 합류 학우:\s*각\s*([\d,]+)원/);
        if (match) return parseInt(match[1].replace(/,/g, ''));
      } else {
        const match = systemMsg.content.match(/처음부터 탑승 학우:\s*각\s*([\d,]+)원/) || systemMsg.content.match(/1인당 송금 요금:\s*([\d,]+)원/);
        if (match) return parseInt(match[1].replace(/,/g, ''));
      }
    }

    // Fallback if not found
    return Math.round(room.total_fare / participantsCount);
  };

  const getFareBreakdown = () => {
    const totalFare = parseInt(totalFareInput) || 0;
    if (totalFare <= 0) return null;

    const midwayCount = Object.values(midwayBoarders).filter(Boolean).length;
    const totalCount = acceptedApplicants.length + 1; // apps + host

    return calculateSegmentFares(totalFare, room.departure, room.destination, midwayCount, totalCount);
  };

  const submitSettlement = async (e) => {
    e.preventDefault();
    if (!totalFareInput || parseInt(totalFareInput) <= 0) {
      alert('올바른 정산 요금을 입력해 주세요.');
      return;
    }

    try {
      await api.rooms.updateFare(roomId, parseInt(totalFareInput), 'settlement');

      const midwayCount = Object.values(midwayBoarders).filter(Boolean).length;
      const totalCount = acceptedApplicants.length + 1;
      const breakdown = calculateSegmentFares(parseInt(totalFareInput), room.departure, room.destination, midwayCount, totalCount);

      // Auto send system message informing fare
      let systemMessage = `📢 방장이 정산 요청을 등록했습니다.\n총 요금: ${parseInt(totalFareInput).toLocaleString()}원\n`;
      if (midwayCount > 0) {
        systemMessage += `- 처음부터 탑승 학우: 각 ${breakdown.startShare.toLocaleString()}원\n- 중간 합류 학우: 각 ${breakdown.midwayShare.toLocaleString()}원\n`;
      } else {
        systemMessage += `- 1인당 송금 요금: ${breakdown.startShare.toLocaleString()}원\n`;
      }
      systemMessage += `정산 계좌 정보는 최상단 안내판을 확인해 주세요.`;

      await api.chats.send(roomId, user.id, systemMessage);

      setIsFareModalOpen(false);
      alert('정산 요청이 전송되었습니다. 탑승자 화면에 정산서가 고지됩니다.');
      fetchRoomData();
    } catch (err) {
      alert(err.message || '정산 실패');
    }
  };

  if (loading && !room) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center bg-theme-emulator py-20 transition-colors">
        <span className="w-8 h-8 border-2 border-theme-blue border-t-transparent rounded-full animate-spin mb-3"></span>
        <span className="text-xs text-theme-text-muted font-bold transition-colors">채팅방 로딩 중...</span>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center p-6 bg-theme-emulator text-center transition-colors">
        <p className="text-sm font-bold text-theme-text-secondary transition-colors">채팅방 정보를 불러올 수 없거나 권한이 없습니다.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-theme-panel border border-theme-border rounded-xl text-xs font-bold text-theme-text-secondary cursor-pointer">
          홈으로 가기
        </button>
      </div>
    );
  }

  const isHost = room.created_by === user.id;

  return (
    <div className="flex flex-col flex-1 bg-theme-emulator text-theme-text-primary transition-colors duration-300 relative min-h-screen">
      {/* 1. Header */}
      <header className="sticky top-0 bg-theme-header backdrop-blur-md border-b border-theme-header-border px-4 py-3 flex items-center justify-between z-10 shadow-sm transition-colors">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 bg-theme-panel border border-theme-border hover:bg-theme-panel/70 rounded-full flex items-center justify-center text-theme-text-secondary hover:text-theme-text-primary transition-colors cursor-pointer"
            style={{ minHeight: '36px', minWidth: '36px' }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-1.5 font-bold transition-colors">
              <span className="text-xs font-black text-theme-text-primary truncate max-w-[110px]">{getDisplayLocation(room.departure)}</span>
              <span className="text-[10px] text-theme-text-muted">➔</span>
              <span className="text-xs font-black text-theme-text-primary truncate max-w-[110px]">{getDisplayLocation(room.destination)}</span>
            </div>
            <span className="text-[9px] text-theme-text-muted block font-bold transition-colors">동승 참여 인원: {participantsCount}명</span>
          </div>
        </div>

        {/* Action Button for State Control */}
        <div className="flex items-center gap-1">
          {isHost && (room.status === 'recruiting' || room.status === 'closed' || room.status === 'riding') && (
            <button
              onClick={advanceState}
              className="px-3.5 py-2 bg-gradient-to-r from-[#003893] to-blue-600 hover:from-theme-blue hover:to-blue-500 text-white text-[10px] font-black rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
              style={{ minHeight: '36px' }}
            >
              {room.status === 'recruiting' && '모집 마감'}
              {room.status === 'closed' && '탑승 출발'}
              {room.status === 'riding' && '정산 요청'}
            </button>
          )}

          {isHost && (
            <button
              onClick={onGoToManage}
              className="px-3 py-2 bg-theme-panel border border-theme-border hover:bg-theme-panel/70 text-theme-text-secondary text-[10px] font-bold rounded-xl transition-colors cursor-pointer"
              style={{ minHeight: '36px' }}
            >
              신청자 관리
            </button>
          )}
        </div>
      </header>

      {/* 2. Top Info Banners (Sticky) */}
      <div className="bg-theme-panel border-b border-theme-border p-3 text-xs space-y-2.5 z-5 transition-colors">
        {/* Warning Banner */}
        <div className="bg-amber-500/10 border border-theme-gold/20 text-theme-gold rounded-2xl p-3 flex items-start gap-2 transition-colors">
          <AlertTriangle size={15} className="text-theme-gold shrink-0 mt-0.5 animate-pulse" />
          <p className="leading-normal font-semibold">
            <strong>안내:</strong> 실제 탑승 이동 완료 후 계좌 정보를 통해 방장에게 N분의 1 금액 송금을 진행해 주세요.
          </p>
        </div>

        {/* Collapsible Kakao Route Map */}
        <div className="border border-theme-border rounded-2xl overflow-hidden bg-theme-input transition-colors">
          <button
            type="button"
            onClick={() => setShowMap(!showMap)}
            className="w-full px-3 py-2.5 bg-theme-panel hover:bg-theme-panel/75 text-theme-text-secondary text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
            style={{ minHeight: '36px' }}
          >
            <span className="flex items-center gap-1.5">
              <span>🗺️</span>
              동승 경로 지도 {showMap ? '접기' : '펼치기'}
            </span>
            <ChevronRight size={14} className={`transform transition-transform ${showMap ? 'rotate-95' : ''}`} />
          </button>

          {showMap && (
            <div className="p-2 bg-theme-input border-t border-theme-border animate-fade-in transition-colors space-y-2">
              <KakaoMap departure={room.departure} destination={room.destination} />
              <button
                type="button"
                onClick={openRouteModal}
                className="w-full py-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-950 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
                style={{ minHeight: '36px' }}
              >
                🚕 경로 확인 및 카카오맵 호출하기
              </button>
            </div>
          )}
        </div>

        {/* Application Status Banner (Visible to non-hosts) */}
        {!isHost && (
          <div className="border border-theme-border rounded-2xl p-4 bg-theme-panel flex flex-col gap-2.5 transition-colors shadow-sm">
            {myStatus === 'none' && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-theme-text-secondary leading-normal">
                  🙋‍♂️ 함께 이동하고 싶으신가요? 아래 버튼을 눌러 동승 신청을 해보세요. 방장이 수락하면 계좌가 공개됩니다.
                </p>

                {/* Midway boarding toggle */}
                <div
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${applyingMidway
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-theme-input border-theme-input-border'
                    }`}
                  onClick={() => setApplyingMidway(v => !v)}
                  role="checkbox"
                  aria-checked={applyingMidway}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-theme-text-primary">
                      🔄 중간 합류로 신청{' '}
                      <span className="text-theme-text-muted font-normal">(대진대 정문 탑승)</span>
                    </span>
                    <span className="text-[10px] text-theme-text-muted">
                      정문에서 탑승하는 중간 합류입니다. 더 낮은 요금이 적용됩니다.
                    </span>
                  </div>
                  <div
                    className={`w-10 h-6 rounded-full transition-all relative shrink-0 ml-3 ${applyingMidway ? 'bg-amber-500' : 'bg-theme-border'
                      }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${applyingMidway ? 'left-5' : 'left-1'
                        }`}
                    />
                  </div>
                </div>

                {/* Midway fare preview */}
                {applyingMidway && room && (() => {
                  const midC = LANDMARK_COORDS.main_gate;
                  const destC = getCoordinates(room.destination, LANDMARK_COORDS.main_gate);
                  const distM = calculateDistance(midC.lat, midC.lng, destC.lat, destC.lng);
                  const estimatedFare = calcTaxiFare(distM);
                  const totalRiders = participantsCount;
                  const myShare = totalRiders > 0 ? Math.round(estimatedFare / totalRiders) : estimatedFare;
                  return (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 text-[11px] space-y-1 animate-fade-in">
                      <p className="font-black text-amber-600">📊 중간 합류 예상 분담금 미리보기</p>
                      <div className="flex justify-between text-theme-text-secondary">
                        <span>정문 → {getDisplayLocation(room.destination)} 예상 요금</span>
                        <span className="font-bold text-theme-text-primary">약 {estimatedFare.toLocaleString()}원</span>
                      </div>
                      <div className="flex justify-between text-theme-text-secondary border-t border-amber-500/20 pt-1">
                        <span>인원({totalRiders}명) 분담 시 나의 예상 요금</span>
                        <span className="font-black text-amber-600">약 {myShare.toLocaleString()}원</span>
                      </div>
                      <p className="text-[9px] text-amber-500/80">⚠️ 실제 미터기 요금을 기준으로 다를 수 있습니다.</p>
                    </div>
                  );
                })()}

                <button
                  type="button"
                  onClick={handleApply}
                  className={`w-full py-3 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer ${applyingMidway
                      ? 'bg-amber-500 hover:bg-amber-600'
                      : 'bg-[#003893] hover:bg-[#002a70]'
                    }`}
                  style={{ minHeight: '40px' }}
                >
                  {applyingMidway ? '🔄 중간 합류로 동승 신청하기' : '🚕 이 팟에 동승 신청하기'}
                </button>
              </div>
            )}


            {myStatus === 'pending' && (
              <div className="flex items-center justify-between text-xs font-medium text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 transition-colors">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
                  참여 신청이 대기 중입니다.
                </span>
                <span className="text-[9px] bg-amber-500/20 px-2 py-0.5 rounded font-black uppercase">수락 대기 중</span>
              </div>
            )}

            {myStatus === 'accepted' && (
              <div className="flex items-center justify-between text-xs font-medium text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 transition-colors">
                <span className="flex items-center gap-1.5">
                  <Check size={14} className="text-emerald-500" />
                  동승 참여가 최종 승인되었습니다!
                </span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-black uppercase">승인 완료</span>
              </div>
            )}

            {myStatus === 'rejected' && (
              <div className="flex items-center justify-between text-xs font-medium text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl p-3 transition-colors">
                <span>동승 참여 신청이 거절되었습니다.</span>
                <span className="text-[9px] bg-red-500/20 text-red-500 px-2 py-0.5 rounded font-black uppercase">거절됨</span>
              </div>
            )}
          </div>
        )}

        {/* Settlement Info / Account Guide Banner (LOCKED for non-accepted guests) */}
        <div className="border border-theme-border rounded-2xl p-3.5 bg-theme-panel flex flex-col gap-2.5 transition-colors">
          <div className="flex items-center justify-between">
            <span className="font-bold text-theme-text-primary flex items-center gap-1.5 transition-colors">
              <Landmark size={14} className="text-theme-blue" />
              정산 계좌 정보
            </span>
            <span className="text-[9px] text-theme-text-muted font-bold transition-colors">방장 학번: {room.host.student_id}</span>
          </div>

          {isHost || myStatus === 'accepted' ? (
            <>
              <div className="flex items-center justify-between bg-theme-input border border-theme-input-border rounded-xl p-2.5 transition-colors">
                <span className="font-extrabold text-theme-text-primary text-xs tracking-wide transition-colors">{room.bank_account}</span>
                <button
                  onClick={handleCopyAccount}
                  className="text-theme-blue text-xs font-bold flex items-center gap-0.5 hover:underline cursor-pointer"
                  style={{ minHeight: '28px' }}
                >
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  {copied ? '복사됨' : '복사'}
                </button>
              </div>

              {room.kakaopay_url && (
                <a
                  href={room.kakaopay_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-955 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-colors shadow-sm"
                  style={{ minHeight: '36px' }}
                >
                  <ExternalLink size={13} />
                  카카오페이 빠른 송금
                </a>
              )}
            </>
          ) : (
            <div className="bg-theme-input border border-dashed border-theme-border rounded-xl p-3.5 text-center text-theme-text-muted text-xs flex items-center justify-center gap-1.5 font-medium transition-colors">
              <span>🔒 계좌 정보는 방장이 신청을 수락하면 공개됩니다.</span>
            </div>
          )}
        </div>

        {/* 3. Settlement N/1 Highlight Banner */}
        {room.status === 'settlement' && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-3xl p-4.5 flex flex-col gap-3 shadow-inner animate-fade-in transition-colors">
            <div className="flex items-center justify-between">
              <span className="font-black text-xs flex items-center gap-1">
                <Calculator size={15} className="text-emerald-500 animate-pulse" />
                자동 N분의 1 정산 안내
              </span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-black uppercase tracking-wider">정산 진행 중</span>
            </div>

            {/* Guest Boarding Selector */}
            {!isHost && (
              <div className="flex justify-between items-center bg-theme-input p-2 rounded-2xl border border-theme-border text-[11px] transition-colors">
                <span className="font-bold text-theme-text-secondary">내 탑승 위치 선택</span>
                <div className="flex bg-theme-panel p-0.5 rounded-lg border border-theme-border">
                  <button
                    type="button"
                    onClick={() => setGuestIsMidway(false)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${!guestIsMidway
                        ? 'bg-theme-blue text-white shadow-sm'
                        : 'text-theme-text-secondary hover:text-theme-text-primary'
                      }`}
                  >
                    처음부터
                  </button>
                  <button
                    type="button"
                    onClick={() => setGuestIsMidway(true)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${guestIsMidway
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'text-theme-text-secondary hover:text-theme-text-primary'
                      }`}
                  >
                    중간 합류
                  </button>
                </div>
              </div>
            )}

            <div className="bg-theme-input border border-theme-input-border rounded-2xl p-3.5 space-y-1.5 transition-colors">
              <div className="flex justify-between text-theme-text-secondary text-xs transition-colors">
                <span>총 택시 요금</span>
                <span className="font-bold text-theme-text-primary">{room.total_fare.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between text-theme-text-secondary text-xs pb-1.5 border-b border-theme-border transition-colors">
                <span>탑승 인원 (방장 포함)</span>
                <span className="font-bold text-theme-text-primary">{participantsCount}명</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="font-bold text-theme-text-primary text-xs">내가 송금할 금액</span>
                <span className="text-sm font-black text-red-500">{getGuestShare().toLocaleString()}원</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Chat Messages Area */}
      <div
        ref={chatContainerRef}
        className="flex-grow flex flex-col overflow-y-auto px-4 py-4 space-y-4 pb-20 bg-theme-panel/20 transition-colors"
      >
        {messages.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-xs text-theme-text-muted font-bold transition-colors">동승자들과 대화를 시작해 보세요!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user.id;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                {/* Sender ID */}
                <span className="text-[10px] font-bold text-theme-text-muted mb-1 px-1 transition-colors">
                  {isMe ? '나' : `학번 ${msg.sender.student_id} (${msg.sender.gender})`}
                </span>

                {/* Bubble */}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs shadow-sm transition-all select-all ${isMe
                      ? 'bg-gradient-to-r from-[#003893] to-[#0055d2] text-white rounded-tr-none'
                      : 'bg-theme-panel border border-theme-border text-theme-text-primary rounded-tl-none'
                    }`}
                  style={{ wordBreak: 'break-all' }}
                >
                  {msg.content}
                </div>

                {/* Time */}
                <span className="text-[9px] text-theme-text-muted mt-1 px-1 transition-colors">
                  {new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* 5. Chat Input Bar */}
      <form
        onSubmit={handleSendMessage}
        className="sticky bottom-0 bg-theme-header border-t border-theme-header-border p-3 flex items-center gap-2.5 z-10 transition-colors"
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="메시지를 입력하세요..."
          className="flex-1 px-4 py-3 bg-theme-input border border-theme-input-border rounded-2xl text-xs focus:outline-none focus:border-theme-input-focus text-theme-text-primary placeholder-theme-text-muted/60 transition-all"
          style={{ minHeight: '44px' }}
        />
        <button
          type="submit"
          className="w-11 h-11 bg-gradient-to-tr from-[#003893] to-blue-500 hover:scale-[1.05] active:scale-[0.9] text-white rounded-2xl flex items-center justify-center transition-all shadow-sm cursor-pointer"
          style={{ minHeight: '40px', minWidth: '40px' }}
        >
          <Send size={18} />
        </button>
      </form>

      {/* 6. Host Taxi Fare Entry Modal */}
      {isFareModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-theme-emulator border border-theme-border rounded-3xl p-6 w-full max-w-[340px] shadow-2xl space-y-4 transition-colors">
            <div className="text-center">
              <Calculator className="w-12 h-12 text-theme-blue mx-auto mb-2 transition-colors" />
              <h3 className="text-base font-black text-theme-text-primary transition-colors">택시 요금 정산 요청</h3>
              <p className="text-[10px] text-theme-text-muted mt-1 leading-normal transition-colors">
                실제 미터기에 나온 총 택시 요금을 입력해 주세요. 인원 수에 맞춰 N분의 1 금액을 자동 청구합니다.
              </p>
            </div>

            <form onSubmit={submitSettlement} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-theme-text-secondary mb-2 ml-1 transition-colors">총 택시 요금</label>
                <div className="relative">
                  <input
                    type="text"
                    value={totalFareInput}
                    onChange={(e) => setTotalFareInput(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="예: 8600"
                    className="w-full px-4 py-3 bg-theme-input border border-theme-input-border rounded-2xl text-sm font-black focus:outline-none focus:border-theme-input-focus text-theme-text-primary pr-10 transition-all placeholder-theme-text-muted/60"
                    style={{ minHeight: '44px' }}
                    required
                  />
                  <span className="absolute inset-y-0 right-4 flex items-center text-xs font-bold text-theme-text-secondary transition-colors">
                    원
                  </span>
                </div>
              </div>

              {/* Midway Boarders selection for Host */}
              {acceptedApplicants.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-theme-text-secondary ml-1 transition-colors">중간 합류자 체크 (선택)</label>
                  <div className="bg-theme-input border border-theme-input-border rounded-2xl p-3 space-y-2 transition-colors max-h-40 overflow-y-auto">
                    {acceptedApplicants.map(app => (
                      <div key={app.id} className="flex justify-between items-center py-1 text-xs">
                        <span className="font-semibold text-theme-text-secondary">
                          학번 {app.user.student_id} ({app.user.gender})
                        </span>
                        <div className="flex bg-theme-panel p-0.5 rounded-lg border border-theme-border">
                          <button
                            type="button"
                            onClick={() => setMidwayBoarders(prev => ({ ...prev, [app.user_id]: false }))}
                            className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${!midwayBoarders[app.user_id]
                                ? 'bg-theme-blue text-white shadow-sm'
                                : 'text-theme-text-secondary'
                              }`}
                          >
                            처음부터
                          </button>
                          <button
                            type="button"
                            onClick={() => setMidwayBoarders(prev => ({ ...prev, [app.user_id]: true }))}
                            className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${midwayBoarders[app.user_id]
                                ? 'bg-amber-500 text-white shadow-sm'
                                : 'text-theme-text-secondary'
                              }`}
                          >
                            중간합류
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {totalFareInput && getFareBreakdown() && (
                <div className="bg-theme-panel p-3.5 rounded-2xl border border-theme-border space-y-2 text-xs transition-colors">
                  <div className="flex justify-between items-center text-[10px] text-theme-text-secondary pb-1 border-b border-theme-border/50">
                    <span>정산 방식</span>
                    <span className="font-bold text-theme-blue">거리 비례 분배</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-theme-text-secondary">
                    <span>기본 탑승자 ({acceptedApplicants.length + 1 - Object.values(midwayBoarders).filter(Boolean).length}명) 1인당:</span>
                    <span className="font-black text-theme-text-primary text-xs">
                      {getFareBreakdown().startShare.toLocaleString()}원
                    </span>
                  </div>
                  {Object.values(midwayBoarders).filter(Boolean).length > 0 && (
                    <div className="flex justify-between items-center text-[10px] text-theme-text-secondary">
                      <span>중간 합류자 ({Object.values(midwayBoarders).filter(Boolean).length}명) 1인당:</span>
                      <span className="font-black text-amber-500 text-xs">
                        {getFareBreakdown().midwayShare.toLocaleString()}원
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsFareModalOpen(false)}
                  className="flex-1 py-3 bg-theme-panel hover:bg-theme-panel/70 text-theme-text-secondary border border-theme-border text-xs font-bold rounded-2xl transition-colors cursor-pointer"
                  style={{ minHeight: '44px' }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-[#003893] to-blue-650 text-white text-xs font-bold rounded-2xl shadow-sm cursor-pointer"
                  style={{ minHeight: '44px' }}
                >
                  요청하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 경로 검색 모달 */}
      {showRouteModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-theme-emulator border border-theme-border rounded-3xl p-5 w-full max-w-[380px] shadow-2xl space-y-4 transition-colors">
            {/* Header */}
            <div className="text-center">
              <span className="text-3xl block mb-1">🗺️</span>
              <h3 className="text-base font-black text-theme-text-primary">경로 검색</h3>
              <p className="text-[10px] text-theme-text-muted mt-1 leading-relaxed">
                출발지와 목적지를 검색하거나 수정한 후 카카오맵에서 경로를 확인하세요.
              </p>
            </div>

            {/* 출발지 검색 */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-theme-text-secondary ml-1">🚩 출발지</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={depSearchInput}
                  onChange={e => setDepSearchInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchKakaoPlaces(depSearchInput, setDepResults)}
                  placeholder="출발지를 검색하세요 (예: 의정부역)"
                  className="flex-1 px-3 py-2.5 bg-theme-input border border-theme-input-border rounded-xl text-xs focus:outline-none focus:border-theme-input-focus text-theme-text-primary placeholder-theme-text-muted/60 transition-all"
                />
                <button
                  type="button"
                  onClick={() => searchKakaoPlaces(depSearchInput, setDepResults)}
                  className="px-3 py-2.5 bg-[#003893] text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-blue-600 active:scale-95 transition-all whitespace-nowrap"
                >
                  검색
                </button>
              </div>
              {routeDep && depResults.length === 0 && (
                <div className="text-[10px] text-emerald-500 ml-1 flex items-center gap-1">
                  <span>✓</span>
                  <span className="font-bold truncate">{routeDep.name}</span>
                  <span className="text-theme-text-muted">선택됨</span>
                </div>
              )}
              {depResults.length > 0 && (
                <div className="bg-theme-panel border border-theme-border rounded-xl overflow-hidden divide-y divide-theme-border shadow-sm">
                  {depResults.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { setRouteDep(r); setDepSearchInput(r.name); setDepResults([]); }}
                      className="w-full px-3 py-2.5 text-left hover:bg-theme-input transition-colors cursor-pointer"
                    >
                      <div className="text-xs font-bold text-theme-text-primary">{r.name}</div>
                      <div className="text-[10px] text-theme-text-muted mt-0.5">{r.address}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 목적지 검색 */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-theme-text-secondary ml-1">📍 목적지</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={destSearchInput}
                  onChange={e => setDestSearchInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchKakaoPlaces(destSearchInput, setDestResults)}
                  placeholder="목적지를 검색하세요 (예: 대진대학교)"
                  className="flex-1 px-3 py-2.5 bg-theme-input border border-theme-input-border rounded-xl text-xs focus:outline-none focus:border-theme-input-focus text-theme-text-primary placeholder-theme-text-muted/60 transition-all"
                />
                <button
                  type="button"
                  onClick={() => searchKakaoPlaces(destSearchInput, setDestResults)}
                  className="px-3 py-2.5 bg-[#003893] text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-blue-600 active:scale-95 transition-all whitespace-nowrap"
                >
                  검색
                </button>
              </div>
              {routeDest && destResults.length === 0 && (
                <div className="text-[10px] text-emerald-500 ml-1 flex items-center gap-1">
                  <span>✓</span>
                  <span className="font-bold truncate">{routeDest.name}</span>
                  <span className="text-theme-text-muted">선택됨</span>
                </div>
              )}
              {destResults.length > 0 && (
                <div className="bg-theme-panel border border-theme-border rounded-xl overflow-hidden divide-y divide-theme-border shadow-sm">
                  {destResults.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { setRouteDest(r); setDestSearchInput(r.name); setDestResults([]); }}
                      className="w-full px-3 py-2.5 text-left hover:bg-theme-input transition-colors cursor-pointer"
                    >
                      <div className="text-xs font-bold text-theme-text-primary">{r.name}</div>
                      <div className="text-[10px] text-theme-text-muted mt-0.5">{r.address}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 버튼 */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowRouteModal(false)}
                className="flex-1 py-3 bg-theme-panel hover:bg-theme-panel/70 text-theme-text-secondary border border-theme-border text-xs font-bold rounded-2xl transition-colors cursor-pointer"
                style={{ minHeight: '44px' }}
              >
                닫기
              </button>
              <button
                type="button"
                onClick={confirmRoute}
                disabled={!routeDep || !routeDest}
                className="flex-1 py-3 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-yellow-950 text-xs font-bold rounded-2xl shadow-sm cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                style={{ minHeight: '44px' }}
              >
                🚕 카카오맵으로 보기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

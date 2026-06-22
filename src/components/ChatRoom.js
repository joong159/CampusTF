'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import NaverMap from '@/components/NaverMap';
import { 
  ArrowLeft, Send, AlertTriangle, Landmark, 
  ChevronRight, Calculator, Check, Copy, ExternalLink, RefreshCw, UserCheck
} from 'lucide-react';

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
  
  const messagesEndRef = useRef(null);

  const fetchRoomData = async () => {
    try {
      const roomsList = await api.rooms.list();
      const currentRoom = roomsList.find(r => r.id === roomId);
      setRoom(currentRoom);
      
      if (currentRoom) {
        setParticipantsCount(currentRoom.participant_count);
        
        const apps = await api.applicants.list(roomId);
        const myApp = apps.find(a => a.user_id === user.id);
        setMyStatus(myApp ? myApp.status : 'none');
      }
      
      const msgs = await api.chats.list(roomId);
      setMessages(msgs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomData();
    
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
      clearInterval(pollInterval);
    };
  }, [roomId]);

  // Scroll to bottom when messages load/change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

    const confirmJoin = window.confirm('이 택시 팟에 동승 참여를 신청하시겠습니까?');
    if (!confirmJoin) return;

    try {
      const { error } = await api.applicants.apply(roomId, user.id);
      if (error) throw error;
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

  const submitSettlement = async (e) => {
    e.preventDefault();
    if (!totalFareInput || parseInt(totalFareInput) <= 0) {
      alert('올바른 정산 요금을 입력해 주세요.');
      return;
    }

    try {
      await api.rooms.updateFare(roomId, parseInt(totalFareInput), 'settlement');
      
      // Auto send system message informing fare
      const systemMessage = `📢 방장이 정산 요청을 등록했습니다.\n총 요금: ${parseInt(totalFareInput).toLocaleString()}원 (1인당 ${Math.round(parseInt(totalFareInput) / participantsCount).toLocaleString()}원씩)\n정산 정보는 최상단 안내판을 확인해 주세요.`;
      await api.chats.send(roomId, user.id, systemMessage);
      
      setIsFareModalOpen(false);
      alert('정산 요청이 전송되었습니다. 탑승자 화면에 정산서가 고지됩니다.');
      fetchRoomData();
    } catch (err) {
      alert(err.message || '정산 실패');
    }
  };

  const calculatePerPerson = () => {
    if (!room || !room.total_fare || !participantsCount) return 0;
    return Math.round(room.total_fare / participantsCount);
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
              <span className="text-xs font-black text-theme-text-primary truncate max-w-[110px]">{room.departure}</span>
              <span className="text-[10px] text-theme-text-muted">➔</span>
              <span className="text-xs font-black text-theme-text-primary truncate max-w-[110px]">{room.destination}</span>
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

        {/* Collapsible Naver Route Map */}
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
            <div className="p-2 bg-theme-input border-t border-theme-border animate-fade-in transition-colors">
              <NaverMap departure={room.departure} destination={room.destination} />
            </div>
          )}
        </div>

        {/* Settlement Info / Account Guide Banner */}
        <div className="border border-theme-border rounded-2xl p-3.5 bg-theme-panel flex flex-col gap-2.5 transition-colors">
          <div className="flex items-center justify-between">
            <span className="font-bold text-theme-text-primary flex items-center gap-1.5 transition-colors">
              <Landmark size={14} className="text-theme-blue" />
              정산 계좌 정보
            </span>
            <span className="text-[9px] text-theme-text-muted font-bold transition-colors">방장 학번: {room.host.student_id}</span>
          </div>
          
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
              className="w-full py-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-950 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-colors shadow-sm"
              style={{ minHeight: '36px' }}
            >
              <ExternalLink size={13} />
              카카오페이 빠른 송금
            </a>
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
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[9px] font-black rounded-md uppercase tracking-wider">정산 진행 중</span>
            </div>
            
            <div className="bg-theme-input border border-theme-input-border rounded-2xl p-3.5 space-y-1.5 transition-colors">
              <div className="flex justify-between text-theme-text-secondary text-xs transition-colors">
                <span>총 택시 요금</span>
                <span className="font-bold text-theme-text-primary">{room.total_fare.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between text-theme-text-secondary text-xs pb-1.5 border-b border-theme-border transition-colors">
                <span>탑승 인원 (방장 포함)</span>
                <span className="font-bold text-theme-text-primary">{participantsCount}명</span>
              </div>
              <div className="flex justify-between items-center pt-1.5">
                <span className="font-extrabold text-theme-text-primary text-xs">1인당 송금 금액</span>
                <span className="text-base font-black text-red-500">{calculatePerPerson().toLocaleString()}원</span>
              </div>
            </div>
            <p className="text-[9px] text-theme-text-muted leading-normal font-semibold transition-colors">
              * 위 계좌정보 또는 카카오페이 버튼을 이용해 <strong className="text-red-400">{calculatePerPerson().toLocaleString()}원</strong>을 송금한 후 완료했다고 톡으로 알려주세요!
            </p>
          </div>
        )}
      </div>

      {/* 4. Chat Messages Area */}
      {isHost || myStatus === 'accepted' ? (
        <div className="flex-grow flex flex-col overflow-y-auto px-4 py-4 space-y-4 pb-20 bg-slate-50 transition-colors">
          {messages.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-xs text-gray-400 font-bold">동승자들과 대화를 시작해 보세요!</p>
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
                  <span className="text-[10px] font-bold text-gray-400 mb-1 px-1">
                    {isMe ? '나' : `학번 ${msg.sender.student_id} (${msg.sender.gender})`}
                  </span>
                  
                  {/* Bubble */}
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                      isMe
                        ? 'bg-[#003893] text-white rounded-tr-none'
                        : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                    }`}
                    style={{ wordBreak: 'break-all' }}
                  >
                    {msg.content}
                  </div>
                  
                  {/* Time */}
                  <span className="text-[9px] text-gray-400 mt-1 px-1">
                    {new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      ) : (
        <div className="flex-grow flex flex-col items-center justify-center p-6 text-center space-y-3 bg-gray-50 border-y border-gray-150">
          <div className="w-14 h-14 bg-[#EBF2FF] text-[#003893] rounded-full flex items-center justify-center text-xl shadow-inner animate-pulse">
            🔒
          </div>
          <h3 className="font-bold text-sm text-gray-800">동승 팀원 전용 대화방</h3>
          <p className="text-xs text-gray-455 max-w-[280px] leading-relaxed">
            방장이 동승 참여 신청을 수락하면 실시간 채팅 대화와 상대방 학번 정보가 공개됩니다.
          </p>
        </div>
      )}

      {/* 5. Chat Input Bar or Application Buttons */}
      {isHost || myStatus === 'accepted' ? (
        <form
          onSubmit={handleSendMessage}
          className="sticky bottom-0 bg-white border-t border-gray-100 p-3 flex items-center gap-2 z-10"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="메시지를 입력하세요..."
            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#003893] focus:bg-white text-gray-850"
            style={{ minHeight: '48px' }}
          />
          <button
            type="submit"
            className="w-12 h-12 bg-[#003893] hover:bg-[#002a70] text-white rounded-xl flex items-center justify-center transition-colors shadow-md active:scale-95"
            style={{ minHeight: '48px', minWidth: '48px' }}
          >
            <Send size={18} />
          </button>
        </form>
      ) : (
        <div className="sticky bottom-0 bg-white border-t border-gray-150 p-4 z-10 flex flex-col gap-2">
          {myStatus === 'none' && (
            <button
              type="button"
              onClick={handleApply}
              className="w-full py-3.5 bg-[#003893] hover:bg-[#002a70] text-white text-xs font-bold rounded-2xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
              style={{ minHeight: '48px' }}
            >
              🚕 이 팟에 동승 참여 신청하기
            </button>
          )}

          {myStatus === 'pending' && (
            <button
              type="button"
              disabled
              className="w-full py-3.5 bg-amber-50 text-amber-600 border border-amber-200 text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5"
              style={{ minHeight: '48px' }}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
              방장 참여 수락 대기 중...
            </button>
          )}

          {myStatus === 'rejected' && (
            <button
              type="button"
              disabled
              className="w-full py-3.5 bg-red-50 text-red-500 border border-red-150 text-xs font-bold rounded-2xl"
              style={{ minHeight: '48px' }}
            >
              동승 신청이 거절됨
            </button>
          )}
        </div>
      )}

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

              {totalFareInput && participantsCount > 0 && (
                <div className="bg-theme-panel p-3 rounded-2xl border border-theme-border flex justify-between items-center text-xs transition-colors">
                  <span className="text-theme-text-secondary font-semibold transition-colors">1인당 예상 정산액:</span>
                  <span className="font-black text-red-500 text-xs">
                    {Math.round(parseInt(totalFareInput) / participantsCount).toLocaleString()}원
                  </span>
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
    </div>
  );
}

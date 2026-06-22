'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { 
  ArrowLeft, Send, AlertTriangle, Landmark, 
  ChevronRight, Calculator, Check, Copy, ExternalLink, RefreshCw 
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
  
  const messagesEndRef = useRef(null);

  const fetchRoomData = async () => {
    try {
      const roomsList = await api.rooms.list();
      const currentRoom = roomsList.find(r => r.id === roomId);
      setRoom(currentRoom);
      
      if (currentRoom) {
        setParticipantsCount(currentRoom.participant_count);
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

    return () => unsubscribe();
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
        const confirmRide = window.confirm('택시에 탑승하셨나요? 상태를 [탑승 중]으로 변경합니다.');
        if (confirmRide) {
          await api.rooms.updateStatus(roomId, 'riding');
          alert('운행 중 상태로 변경되었습니다.');
          fetchRoomData();
        }
      } else if (room.status === 'riding') {
        // Open fare entry modal
        setIsFareModalOpen(true);
      }
    } catch (err) {
      alert(err.message || '상태 업데이트에 실패했습니다.');
    }
  };

  const submitSettlement = async (e) => {
    e.preventDefault();
    const fare = parseInt(totalFareInput);
    if (isNaN(fare) || fare <= 0) {
      alert('올바른 총 요금을 입력해주세요.');
      return;
    }

    try {
      await api.rooms.updateFare(roomId, fare);
      setIsFareModalOpen(false);
      alert('정산 요청이 전송되었습니다.');
      fetchRoomData();
    } catch (err) {
      alert(err.message || '정산 처리 중 오류가 발생했습니다.');
    }
  };

  // N/1 calculation helper
  const calculatePerPerson = () => {
    if (!room || !room.total_fare || participantsCount === 0) return 0;
    return Math.round(room.total_fare / participantsCount);
  };

  if (loading && !room) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center bg-white py-20">
        <span className="w-8 h-8 border-4 border-[#003893] border-t-transparent rounded-full animate-spin mb-2"></span>
        <span className="text-xs text-gray-400 font-semibold">채팅방 접속 중...</span>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center p-6 bg-white text-center">
        <p className="text-sm font-bold text-gray-700">채팅방 정보를 불러올 수 없거나 권한이 없습니다.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-gray-100 rounded-xl text-xs font-bold text-gray-600">
          홈으로 가기
        </button>
      </div>
    );
  }

  const isHost = room.created_by === user.id;

  return (
    <div className="flex flex-col flex-1 bg-slate-50 min-h-screen relative">
      {/* 1. Header */}
      <header className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-700 transition-colors"
            style={{ minHeight: '48px', minWidth: '48px' }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-gray-800 truncate max-w-[130px]">{room.departure}</span>
              <span className="text-xs text-gray-400">➔</span>
              <span className="text-sm font-bold text-gray-800 truncate max-w-[130px]">{room.destination}</span>
            </div>
            <span className="text-[10px] text-gray-400 block font-semibold">동승 참여 인원: {participantsCount}명</span>
          </div>
        </div>

        {/* Action Button for State Control */}
        <div className="flex items-center gap-1">
          {isHost && (room.status === 'recruiting' || room.status === 'closed' || room.status === 'riding') && (
            <button
              onClick={advanceState}
              className="px-3 py-2 bg-[#003893] hover:bg-[#002a70] text-white text-[11px] font-bold rounded-lg shadow-sm transition-colors"
              style={{ minHeight: '40px' }}
            >
              {room.status === 'recruiting' && '모집 마감'}
              {room.status === 'closed' && '탑승 출발'}
              {room.status === 'riding' && '정산 요청'}
            </button>
          )}

          {isHost && (
            <button
              onClick={onGoToManage}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold rounded-lg transition-colors ml-1"
              style={{ minHeight: '40px' }}
            >
              신청자 관리
            </button>
          )}
        </div>
      </header>

      {/* 2. Top Info Banners (Sticky) */}
      <div className="bg-white border-b border-gray-100 p-3 text-xs space-y-2 z-5">
        {/* Warning Banner */}
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-2.5 flex items-start gap-2">
          <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="leading-normal font-semibold">
            🚨 <strong>안내:</strong> 운행 중 실제 탑승 후 방장에게 N분의 1 금액 송금하는 것을 잊지 마세요!
          </p>
        </div>

        {/* Settlement Info / Account Guide Banner */}
        <div className="border border-gray-100 rounded-xl p-3 bg-gray-50 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-gray-700 flex items-center gap-1.5">
              <Landmark size={14} className="text-[#003893]" />
              정산 계좌 정보
            </span>
            <span className="text-[10px] text-gray-400 font-bold">방장: {room.host.student_id}</span>
          </div>
          
          <div className="flex items-center justify-between bg-white border border-gray-100 rounded-lg p-2">
            <span className="font-bold text-gray-800">{room.bank_account}</span>
            <button
              onClick={handleCopyAccount}
              className="text-[#003893] text-xs font-bold flex items-center gap-0.5 hover:underline"
              style={{ minHeight: '32px' }}
            >
              {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              {copied ? '복사됨' : '복사'}
            </button>
          </div>

          {room.kakaopay_url && (
            <a
              href={room.kakaopay_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 bg-yellow-300 hover:bg-yellow-400 text-yellow-900 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-colors"
              style={{ minHeight: '36px' }}
            >
              <ExternalLink size={13} />
              카카오페이로 빠른 송금
            </a>
          )}
        </div>

        {/* 3. Settlement N/1 Highlight Banner */}
        {room.status === 'settlement' && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-3.5 flex flex-col gap-2 shadow-sm animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sm flex items-center gap-1">
                <Calculator size={16} className="text-green-600 animate-pulse" />
                자동 N분의 1 정산 안내
              </span>
              <span className="px-2 py-0.5 bg-green-200 text-green-800 text-[10px] font-bold rounded">정산 진행 중</span>
            </div>
            
            <div className="bg-white border border-green-100 rounded-lg p-3 space-y-1.5">
              <div className="flex justify-between text-gray-500 text-xs">
                <span>총 택시 요금</span>
                <span>{room.total_fare.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between text-gray-500 text-xs pb-1.5 border-b border-gray-100">
                <span>탑승 인원 (방장 포함)</span>
                <span>{participantsCount}명</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="font-bold text-gray-800 text-xs">1인당 송금 금액</span>
                <span className="text-base font-black text-red-500">{calculatePerPerson().toLocaleString()}원</span>
              </div>
            </div>
            <p className="text-[10px] text-green-700 leading-normal">
              * 위 계좌정보 또는 카카오페이 버튼을 이용해 <strong>{calculatePerPerson().toLocaleString()}원</strong>을 송금한 후 완료했다고 톡으로 알려주세요!
            </p>
          </div>
        )}
      </div>

      {/* 4. Chat Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-20">
        {messages.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-xs text-gray-400">동승자들과 대화를 시작해 보세요!</p>
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

      {/* 5. Chat Input Bar */}
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

      {/* 6. Host Taxi Fare Entry Modal */}
      {isFareModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-[360px] shadow-2xl space-y-4">
            <div className="text-center">
              <Calculator className="w-12 h-12 text-[#003893] mx-auto mb-2" />
              <h3 className="text-lg font-bold text-gray-800">택시 요금 정산 요청</h3>
              <p className="text-xs text-gray-500 mt-1">
                실제 미터기에 나온 총 택시 요금을 입력해 주세요. 인원 수에 맞춰 N분의 1 금액을 자동 청구합니다.
              </p>
            </div>
            
            <form onSubmit={submitSettlement} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 ml-1">총 택시 요금</label>
                <div className="relative">
                  <input
                    type="text"
                    value={totalFareInput}
                    onChange={(e) => setTotalFareInput(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="예: 8600"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-[#003893] focus:bg-white text-gray-800 pr-10"
                    style={{ minHeight: '48px' }}
                    required
                  />
                  <span className="absolute inset-y-0 right-4 flex items-center text-sm font-bold text-gray-500">
                    원
                  </span>
                </div>
              </div>

              {totalFareInput && participantsCount > 0 && (
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-semibold">1인당 예상 정산액:</span>
                  <span className="font-black text-red-500 text-sm">
                    {Math.round(parseInt(totalFareInput) / participantsCount).toLocaleString()}원
                  </span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsFareModalOpen(false)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-bold rounded-xl"
                  style={{ minHeight: '48px' }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#003893] hover:bg-[#002a70] text-white text-sm font-bold rounded-xl shadow-md"
                  style={{ minHeight: '48px' }}
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

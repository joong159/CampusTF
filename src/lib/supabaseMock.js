// Mock database using LocalStorage to allow testing without Supabase configured

const isBrowser = typeof window !== 'undefined';

const getStorageItem = (key, defaultValue) => {
  if (!isBrowser) return defaultValue;
  const item = localStorage.getItem(key);
  return item ? JSON.parse(item) : defaultValue;
};

const setStorageItem = (key, value) => {
  if (!isBrowser) return;
  localStorage.setItem(key, JSON.stringify(value));
};

// Initialize Mock Data if empty
if (isBrowser) {
  if (!localStorage.getItem('mock_profiles')) {
    setStorageItem('mock_profiles', [
      { id: 'user-1', email: 'test1@daejin.ac.kr', student_id: '20201234', gender: '남' },
      { id: 'user-2', email: 'test2@daejin.ac.kr', student_id: '20215678', gender: '여' },
      { id: 'user-3', email: 'test3@daejin.ac.kr', student_id: '20229876', gender: '남' },
    ]);
  }
  if (!localStorage.getItem('mock_rooms')) {
    setStorageItem('mock_rooms', [
      {
        id: 'room-1',
        created_by: 'user-1',
        departure: '대진대역 1번출구',
        destination: '대진대 정문',
        departure_time: new Date(Date.now() + 1000 * 60 * 30).toISOString(), // 30 mins later
        capacity: 4,
        gender_filter: 'anyone',
        status: 'recruiting',
        total_fare: 0,
        bank_account: '국민은행 123-456-789012',
        kakaopay_url: 'https://qr.kakaopay.com/123456789',
        created_at: new Date().toISOString(),
      },
      {
        id: 'room-2',
        created_by: 'user-2',
        departure: '포천터미널',
        destination: '대진대 공학관',
        departure_time: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // 1 hour later
        capacity: 3,
        gender_filter: 'same_gender', // since creator is Female, only female can join
        status: 'recruiting',
        total_fare: 0,
        bank_account: '신한은행 987-654-321098',
        kakaopay_url: '',
        created_at: new Date().toISOString(),
      }
    ]);
  }
  if (!localStorage.getItem('mock_applicants')) {
    setStorageItem('mock_applicants', [
      { id: 'app-1', room_id: 'room-1', user_id: 'user-3', status: 'accepted', created_at: new Date().toISOString() },
    ]);
  }
  if (!localStorage.getItem('mock_chats')) {
    setStorageItem('mock_chats', [
      { id: 'msg-1', room_id: 'room-1', sender_id: 'user-1', content: '안녕하세요! 대진대역 1번출구 다이소 앞에서 만나요.', created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
      { id: 'msg-2', room_id: 'room-1', sender_id: 'user-3', content: '네, 알겠습니다. 5분 뒤에 도착합니다!', created_at: new Date(Date.now() - 1000 * 60 * 2).toISOString() },
    ]);
  }
}

export const supabaseMock = {
  auth: {
    signUp: async ({ email, password, options }) => {
      const student_id = options?.data?.student_id || '';
      const gender = options?.data?.gender || '남';
      
      const profiles = getStorageItem('mock_profiles', []);
      if (profiles.some(p => p.email === email)) {
        return { data: null, error: { message: '이미 가입된 이메일 주소입니다.' } };
      }
      
      const userId = 'user-' + Math.random().toString(36).substr(2, 9);
      const newProfile = { id: userId, email, student_id, gender };
      profiles.push(newProfile);
      setStorageItem('mock_profiles', profiles);
      
      const session = { user: { id: userId, email, user_metadata: { student_id, gender } } };
      setStorageItem('mock_current_session', session);
      return { data: session, error: null };
    },
    
    signInWithPassword: async ({ email, password }) => {
      const profiles = getStorageItem('mock_profiles', []);
      const profile = profiles.find(p => p.email === email);
      if (!profile) {
        return { data: null, error: { message: '가입되지 않은 이메일이거나 비밀번호가 틀렸습니다.' } };
      }
      
      const session = { user: { id: profile.id, email, user_metadata: { student_id: profile.student_id, gender: profile.gender } } };
      setStorageItem('mock_current_session', session);
      return { data: session, error: null };
    },
    
    signOut: async () => {
      if (isBrowser) {
        localStorage.removeItem('mock_current_session');
      }
      return { error: null };
    },
    
    getUser: async () => {
      const session = getStorageItem('mock_current_session', null);
      return { data: session, error: null };
    }
  },
  
  db: {
    getProfiles: () => getStorageItem('mock_profiles', []),
    getProfile: (userId) => {
      const profiles = getStorageItem('mock_profiles', []);
      return profiles.find(p => p.id === userId) || null;
    },
    
    getRooms: async () => {
      const rooms = getStorageItem('mock_rooms', []);
      const profiles = getStorageItem('mock_profiles', []);
      const applicants = getStorageItem('mock_applicants', []);
      
      // Populate host and count of accepted participants
      return rooms.map(room => {
        const host = profiles.find(p => p.id === room.created_by) || { id: room.created_by, student_id: '알수없음', gender: '남' };
        const roomApps = applicants.filter(a => a.room_id === room.id && a.status === 'accepted');
        return {
          ...room,
          host,
          participant_count: roomApps.length + 1, // count host too
          accepted_user_ids: [room.created_by, ...roomApps.map(a => a.user_id)]
        };
      }).sort((a, b) => new Date(a.departure_time) - new Date(b.departure_time));
    },
    
    createRoom: async (roomData, userId) => {
      const rooms = getStorageItem('mock_rooms', []);
      const newRoom = {
        id: 'room-' + Math.random().toString(36).substr(2, 9),
        created_by: userId,
        ...roomData,
        status: 'recruiting',
        total_fare: 0,
        created_at: new Date().toISOString()
      };
      rooms.push(newRoom);
      setStorageItem('mock_rooms', rooms);
      return { data: newRoom, error: null };
    },
    
    updateRoomStatus: async (roomId, status) => {
      const rooms = getStorageItem('mock_rooms', []);
      const roomIndex = rooms.findIndex(r => r.id === roomId);
      if (roomIndex > -1) {
        rooms[roomIndex].status = status;
        setStorageItem('mock_rooms', rooms);
        // Trigger window storage event to update other components locally
        if (isBrowser) window.dispatchEvent(new Event('storage'));
        return { data: rooms[roomIndex], error: null };
      }
      return { data: null, error: { message: '방을 찾을 수 없습니다.' } };
    },
    
    updateRoomFare: async (roomId, fare, status = 'settlement') => {
      const rooms = getStorageItem('mock_rooms', []);
      const roomIndex = rooms.findIndex(r => r.id === roomId);
      if (roomIndex > -1) {
        rooms[roomIndex].total_fare = parseInt(fare) || 0;
        rooms[roomIndex].status = status;
        setStorageItem('mock_rooms', rooms);
        if (isBrowser) window.dispatchEvent(new Event('storage'));
        return { data: rooms[roomIndex], error: null };
      }
      return { data: null, error: { message: '방을 찾을 수 없습니다.' } };
    },
    
    getApplicants: async (roomId) => {
      const applicants = getStorageItem('mock_applicants', []);
      const profiles = getStorageItem('mock_profiles', []);
      
      return applicants
        .filter(a => a.room_id === roomId)
        .map(a => {
          const user = profiles.find(p => p.id === a.user_id) || { id: a.user_id, student_id: '알수없음', gender: '남' };
          return { ...a, user };
        });
    },
    
    applyForRoom: async (roomId, userId) => {
      const applicants = getStorageItem('mock_applicants', []);
      if (applicants.some(a => a.room_id === roomId && a.user_id === userId)) {
        return { error: { message: '이미 신청한 방입니다.' } };
      }
      
      const newApp = {
        id: 'app-' + Math.random().toString(36).substr(2, 9),
        room_id: roomId,
        user_id: userId,
        status: 'pending',
        created_at: new Date().toISOString()
      };
      applicants.push(newApp);
      setStorageItem('mock_applicants', applicants);
      if (isBrowser) window.dispatchEvent(new Event('storage'));
      return { data: newApp, error: null };
    },
    
    updateApplicantStatus: async (applicantId, status) => {
      const applicants = getStorageItem('mock_applicants', []);
      const appIndex = applicants.findIndex(a => a.id === applicantId);
      if (appIndex > -1) {
        applicants[appIndex].status = status;
        setStorageItem('mock_applicants', applicants);
        if (isBrowser) window.dispatchEvent(new Event('storage'));
        return { data: applicants[appIndex], error: null };
      }
      return { error: { message: '신청 항목을 찾을 수 없습니다.' } };
    },
    
    getMessages: async (roomId) => {
      const chats = getStorageItem('mock_chats', []);
      const profiles = getStorageItem('mock_profiles', []);
      
      return chats
        .filter(c => c.room_id === roomId)
        .map(c => {
          const sender = profiles.find(p => p.id === c.sender_id) || { student_id: '알수없음' };
          return { ...c, sender };
        });
    },
    
    sendMessage: async (roomId, senderId, content) => {
      const chats = getStorageItem('mock_chats', []);
      const newMsg = {
        id: 'msg-' + Math.random().toString(36).substr(2, 9),
        room_id: roomId,
        sender_id: senderId,
        content,
        created_at: new Date().toISOString()
      };
      chats.push(newMsg);
      setStorageItem('mock_chats', chats);
      if (isBrowser) window.dispatchEvent(new Event('storage'));
      return { data: newMsg, error: null };
    }
  }
};

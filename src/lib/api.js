import { supabase, isSupabaseConfigured } from './supabase';
import { supabaseMock } from './supabaseMock';

export const isMock = !isSupabaseConfigured;

if (typeof window !== 'undefined') {
  console.log(
    isMock
      ? '🚀 Running in MOCK Mode (No Supabase keys detected in env.local). Data is persisted in LocalStorage.'
      : '⚡ Running in SUPABASE Mode. Connected to your live database!'
  );
}

export const api = {
  isMock,
  
  auth: {
    signUp: async (email, password, studentId, gender) => {
      if (isMock) {
        return supabaseMock.auth.signUp({
          email,
          password,
          options: { data: { student_id: studentId, gender } },
        });
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { student_id: studentId, gender } },
      });
      
      return { data, error };
    },

    signIn: async (email, password) => {
      if (isMock) {
        return supabaseMock.auth.signInWithPassword({ email, password });
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      return { data, error };
    },

    signOut: async () => {
      if (isMock) {
        return supabaseMock.auth.signOut();
      }
      const { error } = await supabase.auth.signOut();
      return { error };
    },

    getUser: async () => {
      if (isMock) {
        return supabaseMock.auth.getUser();
      }
      
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) return { data: null, error };
      
      // Get additional profile data (gender, student_id)
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      const user = {
        ...session.user,
        user_metadata: {
          ...session.user.user_metadata,
          student_id: profile?.student_id || session.user.user_metadata.student_id,
          gender: profile?.gender || session.user.user_metadata.gender,
        }
      };
      
      return { data: { user }, error: null };
    },
  },

  rooms: {
    list: async () => {
      if (isMock) {
        return supabaseMock.db.getRooms();
      }
      
      const { data: rooms, error } = await supabase
        .from('rooms')
        .select(`
          *,
          host:profiles!rooms_created_by_fkey(id, email, student_id, gender)
        `)
        .order('departure_time', { ascending: true });
        
      if (error) return [];
      
      // Fetch accepted participant counts for each room
      const roomsWithCounts = await Promise.all(
        rooms.map(async (room) => {
          const { data: apps } = await supabase
            .from('applicants')
            .select('user_id')
            .eq('room_id', room.id)
            .eq('status', 'accepted');
            
          const participant_count = (apps?.length || 0) + 1; // plus host
          const accepted_user_ids = [room.created_by, ...(apps?.map(a => a.user_id) || [])];
          
          return {
            ...room,
            participant_count,
            accepted_user_ids
          };
        })
      );
      
      return roomsWithCounts;
    },

    create: async (roomData, userId) => {
      if (isMock) {
        return supabaseMock.db.createRoom(roomData, userId);
      }
      
      const { data, error } = await supabase
        .from('rooms')
        .insert({
          created_by: userId,
          ...roomData,
        })
        .select()
        .single();
        
      return { data, error };
    },

    updateStatus: async (roomId, status) => {
      if (isMock) {
        return supabaseMock.db.updateRoomStatus(roomId, status);
      }
      
      const { data, error } = await supabase
        .from('rooms')
        .update({ status })
        .eq('id', roomId)
        .select()
        .single();
        
      return { data, error };
    },

    updateFare: async (roomId, totalFare, status = 'settlement') => {
      if (isMock) {
        return supabaseMock.db.updateRoomFare(roomId, totalFare, status);
      }
      
      const { data, error } = await supabase
        .from('rooms')
        .update({ total_fare: parseInt(totalFare) || 0, status })
        .eq('id', roomId)
        .select()
        .single();
        
      return { data, error };
    },
  },

  applicants: {
    list: async (roomId) => {
      if (isMock) {
        return supabaseMock.db.getApplicants(roomId);
      }
      
      const { data, error } = await supabase
        .from('applicants')
        .select(`
          *,
          user:profiles(id, email, student_id, gender)
        `)
        .eq('room_id', roomId);
        
      return data || [];
    },

    apply: async (roomId, userId, isMidwayBoarding = false, midwayLocation = null) => {
      if (isMock) {
        return supabaseMock.db.applyForRoom(roomId, userId);
      }
      
      const { data, error } = await supabase
        .from('applicants')
        .insert({
          room_id: roomId,
          user_id: userId,
          status: 'pending',
          is_midway_boarding: isMidwayBoarding,
          midway_location: midwayLocation,
        })
        .select()
        .single();
        
      return { data, error };
    },

    updateStatus: async (applicantId, status) => {
      if (isMock) {
        return supabaseMock.db.updateApplicantStatus(applicantId, status);
      }
      
      const { data, error } = await supabase
        .from('applicants')
        .update({ status })
        .eq('id', applicantId)
        .select()
        .single();
        
      return { data, error };
    },
  },

  chats: {
    list: async (roomId) => {
      if (isMock) {
        return supabaseMock.db.getMessages(roomId);
      }
      
      const { data, error } = await supabase
        .from('chats')
        .select(`
          *,
          sender:profiles(id, student_id, gender)
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });
        
      return data || [];
    },

    send: async (roomId, senderId, content) => {
      if (isMock) {
        return supabaseMock.db.sendMessage(roomId, senderId, content);
      }
      
      const { data, error } = await supabase
        .from('chats')
        .insert({
          room_id: roomId,
          sender_id: senderId,
          content,
        })
        .select()
        .single();
        
      return { data, error };
    },

    // Realtime channel subscription
    subscribe: (roomId, onNewMessage, onRoomUpdate) => {
      if (isMock) {
        // Simulating realtime by listening to the localstorage event
        const handleStorageChange = async () => {
          const msgs = await supabaseMock.db.getMessages(roomId);
          const rooms = await supabaseMock.db.getRooms();
          const room = rooms.find(r => r.id === roomId);
          if (onNewMessage) onNewMessage(msgs);
          if (onRoomUpdate && room) onRoomUpdate(room);
        };
        
        if (typeof window !== 'undefined') {
          window.addEventListener('storage', handleStorageChange);
          // Also set up a small interval to poll changes in the same tab
          const intervalId = setInterval(handleStorageChange, 1500);
          return () => {
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(intervalId);
          };
        }
        return () => {};
      }
      
      // Real Supabase Realtime channel setup
      const channel = supabase
        .channel(`room:${roomId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chats', filter: `room_id=eq.${roomId}` },
          async (payload) => {
            // Fetch sender profile info
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, student_id, gender')
              .eq('id', payload.new.sender_id)
              .single();
            
            const fullMsg = {
              ...payload.new,
              sender: profile
            };
            onNewMessage(prev => [...prev, fullMsg]);
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
          (payload) => {
            if (onRoomUpdate) {
              onRoomUpdate(payload.new);
            }
          }
        )
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
      };
    },
  },
};

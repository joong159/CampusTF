'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Compass, AlertCircle, Play, Square } from 'lucide-react';

const kakaoAppKey = process.env.NEXT_PUBLIC_KAKAO_MAPS_APP_KEY || '';

const isKakaoConfigured = !!(
  kakaoAppKey &&
  kakaoAppKey !== '여기에-카카오-맵-자바스크립트-키' &&
  !kakaoAppKey.includes('여기에')
);

// Coordinates of landmarks
export const LANDMARK_COORDS = {
  station: { lat: 37.875184, lng: 127.156525, name: '대진대역 1번출구' },
  main_gate: { lat: 37.896245, lng: 127.186847, name: '대진대 정문' },
  engineering_bldg: { lat: 37.899120, lng: 127.183492, name: '대진대 공학관' },
  terminal: { lat: 37.894812, lng: 127.206691, name: '포천터미널' },
  uijeongbu: { lat: 37.738411, lng: 127.045934, name: '의정부역' },
};

// Preset route distances and fares
export const ROUTE_DATA = {
  '대진대역 1번출구-대진대 정문': { distance: '4.5km', fare: 7500 },
  '대진대역 1번출구-대진대 공학관': { distance: '5.2km', fare: 8300 },
  '대진대 정문-대진대역 1번출구': { distance: '4.5km', fare: 7500 },
  '대진대 공학관-대진대역 1번출구': { distance: '5.2km', fare: 8300 },
  
  '포천터미널-대진대 정문': { distance: '6.8km', fare: 10200 },
  '포천터미널-대진대 공학관': { distance: '7.5km', fare: 11000 },
  '대진대 정문-포천터미널': { distance: '6.8km', fare: 10200 },
  '대진대 공학관-포천터미널': { distance: '7.5km', fare: 11000 },
  
  '의정부역-대진대 정문': { distance: '17.5km', fare: 23500 },
  '의정부역-대진대 공학관': { distance: '18.2km', fare: 24300 },
  '대진대 정문-의정부역': { distance: '17.5km', fare: 23500 },
  '대진대 공학관-의정부역': { distance: '18.2km', fare: 24300 },
};

export const getRouteDetails = (dep, dest) => {
  const depCoords = getCoordinates(dep, LANDMARK_COORDS.station);
  const destCoords = getCoordinates(dest, LANDMARK_COORDS.main_gate);
  
  const key = `${depCoords.name}-${destCoords.name}`;
  return ROUTE_DATA[key] || { distance: '약 5.0km', fare: 8000 };
};

// Substring helper
export const getCoordinates = (locationName, defaultCoords) => {
  if (!locationName) return defaultCoords;
  const name = locationName.toLowerCase();
  
  if (name.includes('정문')) return { ...LANDMARK_COORDS.main_gate, name: '대진대 정문' };
  if (name.includes('역') || name.includes('선단')) return { ...LANDMARK_COORDS.station, name: '대진대역 1번출구' };
  if (name.includes('터미널') || name.includes('포천터')) return { ...LANDMARK_COORDS.terminal, name: '포천터미널' };
  if (name.includes('의정부')) return { ...LANDMARK_COORDS.uijeongbu, name: '의정부역' };
  if (name.includes('공학') || name.includes('대학') || name.includes('관')) return { ...LANDMARK_COORDS.engineering_bldg, name: '대진대 공학관' };
  
  return { ...defaultCoords, name: locationName };
};

export default function KakaoMap({ departure, destination }) {
  const mapContainerRef = useRef(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [mockProgress, setMockProgress] = useState(0); // 0 to 100 for SVG animation
  const [routePath, setRoutePath] = useState([]); // Array of { lat, lng }
  
  const mapRef = useRef(null);
  const carMarkerRef = useRef(null);
  const simIntervalRef = useRef(null);

  const depCoords = getCoordinates(departure, LANDMARK_COORDS.station);
  const destCoords = getCoordinates(destination, LANDMARK_COORDS.main_gate);

  // Cleanup simulation on unmount
  const stopSimulation = () => {
    setIsSimulating(false);
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    if (carMarkerRef.current) {
      carMarkerRef.current.setMap(null);
      carMarkerRef.current = null;
    }
    setMockProgress(0);
  };

  useEffect(() => {
    let active = true;
    const fetchRoute = async () => {
      try {
        const res = await fetch(`/api/directions?start=${depCoords.lng},${depCoords.lat}&goal=${destCoords.lng},${destCoords.lat}`);
        if (res.ok) {
          const data = await res.json();
          if (active && data.path && data.path.length > 0) {
            setRoutePath(data.path);
            return;
          }
        }
      } catch (e) {
        console.error('Failed to fetch route:', e);
      }
      if (active) {
        setRoutePath([
          { lat: depCoords.lat, lng: depCoords.lng },
          { lat: destCoords.lat, lng: destCoords.lng }
        ]);
      }
    };

    fetchRoute();
    return () => {
      active = false;
    };
  }, [departure, destination, depCoords.lat, depCoords.lng, destCoords.lat, destCoords.lng]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.kakao && window.kakao.maps) {
        setTimeout(() => setScriptLoaded(true), 0);
      } else {
        // Poll until global Kakao Map script loads in layout
        const interval = setInterval(() => {
          if (window.kakao && window.kakao.maps) {
            setTimeout(() => setScriptLoaded(true), 0);
            clearInterval(interval);
          }
        }, 150);
        
        const timeout = setTimeout(() => {
          clearInterval(interval);
        }, 10000); // 10s timeout limit
        
        return () => {
          clearInterval(interval);
          clearTimeout(timeout);
          stopSimulation();
        };
      }
    }
    return () => stopSimulation();
  }, []);

  // Start GPS Simulation
  const startSimulation = () => {
    stopSimulation();
    setIsSimulating(true);

    const pathPoints = routePath.length > 0 ? routePath : [
      { lat: depCoords.lat, lng: depCoords.lng },
      { lat: destCoords.lat, lng: destCoords.lng }
    ];
    
    // Live Kakao Map Simulation
    const kakao = window.kakao;
    if (kakao && kakao.maps && mapRef.current) {
      const startPt = pathPoints[0];
      
      // Create HTML Element for custom taxi icon overlay
      const taxiContent = document.createElement('div');
      taxiContent.style.cssText = 'background-color: #f59e0b; color: white; padding: 5px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; font-size: 16px;';
      taxiContent.innerHTML = '🚕';

      const carOverlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(startPt.lat, startPt.lng),
        content: taxiContent,
        xAnchor: 0.5,
        yAnchor: 0.5,
        zIndex: 100
      });
      carOverlay.setMap(mapRef.current);
      carMarkerRef.current = carOverlay;

      let progress = 0;
      const steps = Math.max(30, pathPoints.length * 3);
      const intervalMs = Math.max(100, Math.floor(7500 / steps));
      const totalPoints = pathPoints.length;

      simIntervalRef.current = setInterval(() => {
        progress += 1;
        const t = progress / steps;

        if (t >= 1) {
          const destPt = pathPoints[totalPoints - 1];
          carOverlay.setPosition(new kakao.maps.LatLng(destPt.lat, destPt.lng));
          mapRef.current.panTo(new kakao.maps.LatLng(destPt.lat, destPt.lng));
          clearInterval(simIntervalRef.current);
          setIsSimulating(false);
          alert('목적지에 도착했습니다! 요금을 확인해 주세요.');
          carOverlay.setMap(null);
          carMarkerRef.current = null;
        } else {
          const rawIndex = t * (totalPoints - 1);
          const segmentIndex = Math.floor(rawIndex);
          const segmentT = rawIndex - segmentIndex;

          const p1 = pathPoints[segmentIndex];
          const p2 = pathPoints[segmentIndex + 1];

          if (p1 && p2) {
            const lat = p1.lat + (p2.lat - p1.lat) * segmentT;
            const lng = p1.lng + (p2.lng - p1.lng) * segmentT;
            const newPos = new kakao.maps.LatLng(lat, lng);
            
            carOverlay.setPosition(newPos);
            mapRef.current.panTo(newPos);
          }
        }
      }, intervalMs);
    }
  };

  useEffect(() => {
    if (!scriptLoaded || !isKakaoConfigured || !mapContainerRef.current || routePath.length === 0) return;

    const kakao = window.kakao;
    if (!kakao || !kakao.maps) return;

    kakao.maps.load(() => {
      try {
        const container = mapContainerRef.current;
        const midLat = (depCoords.lat + destCoords.lat) / 2;
        const midLng = (depCoords.lng + destCoords.lng) / 2;

        const mapOptions = {
          center: new kakao.maps.LatLng(midLat, midLng),
          level: 5 // Kakao Maps zoom level (smaller = more detailed)
        };

        const map = new kakao.maps.Map(container, mapOptions);
        mapRef.current = map;

        // Start Marker
        new kakao.maps.Marker({
          position: new kakao.maps.LatLng(depCoords.lat, depCoords.lng),
          map: map
        });

        // Destination Marker
        new kakao.maps.Marker({
          position: new kakao.maps.LatLng(destCoords.lat, destCoords.lng),
          map: map
        });

        // Draw Polyline
        const kakaoPath = routePath.map(pt => new kakao.maps.LatLng(pt.lat, pt.lng));
        const polyline = new kakao.maps.Polyline({
          path: kakaoPath,
          strokeWeight: 5,
          strokeColor: '#003893', // Theme Blue
          strokeOpacity: 0.8,
          strokeStyle: 'solid'
        });
        polyline.setMap(map);

        // Adjust Bounds
        const bounds = new kakao.maps.LatLngBounds();
        kakaoPath.forEach(latlng => bounds.extend(latlng));
        map.setBounds(bounds);

      } catch (e) {
        console.error('Failed to render Kakao Map:', e);
        setTimeout(() => setMapError(true), 0);
      }
    });
  }, [scriptLoaded, departure, destination, depCoords.lat, depCoords.lng, destCoords.lat, destCoords.lng, routePath]);

  // Render Mock fallback if Kakao is not configured or fails
  if (!isKakaoConfigured || mapError) {
    // Interpolate coords for Mock SVG Animation
    const mockCarX = 20 + (80 - 20) * (mockProgress / 100);
    const mockCarY = 70 + (30 - 70) * (mockProgress / 100);

    return (
      <div className="w-full h-44 bg-slate-800 rounded-xl relative overflow-hidden border border-slate-700 flex flex-col justify-between p-3 select-none">
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:20px_20px]"></div>
        
        {/* Mock Path Line */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path 
            d="M 20 70 Q 50 80 50 50 T 80 30" 
            fill="none" 
            stroke="#003893" 
            strokeWidth="2" 
            strokeDasharray="4"
            className="opacity-40"
          />
          <path 
            d="M 20 70 Q 50 80 50 50 T 80 30" 
            fill="none" 
            stroke="#3b82f6" 
            strokeWidth="2.5" 
            strokeDasharray={isSimulating ? '100' : '0'} 
            strokeDashoffset={isSimulating ? '0' : '0'}
            className="transition-all duration-300"
          />
          
          {/* Simulated Taxi Car */}
          {isSimulating && (
            <g transform={`translate(${mockCarX - 3}, ${mockCarY - 3})`}>
              <circle cx="3" cy="3" r="4.5" fill="#f59e0b" stroke="white" strokeWidth="1" />
              <text x="1" y="5" fontSize="3" fill="white" fontWeight="black" style={{ userSelect: 'none' }}>🚕</text>
            </g>
          )}
        </svg>

        {/* Start Point Badge */}
        <div className="absolute left-[15%] bottom-[20%] flex flex-col items-center animate-fade-in">
          <div className="bg-emerald-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md shadow-md flex items-center gap-0.5 border border-white/10">
            <MapPin size={7} />
            <span>출발</span>
          </div>
          <span className="text-[9px] text-white/80 font-bold mt-1 bg-slate-900/60 px-1 rounded truncate max-w-[80px]">
            {depCoords.name}
          </span>
        </div>

        {/* Destination Point Badge */}
        <div className="absolute right-[15%] top-[20%] flex flex-col items-center animate-fade-in">
          <div className="bg-[#003893] text-white text-[8px] font-black px-1.5 py-0.5 rounded-md shadow-md flex items-center gap-0.5 border border-white/10">
            <Navigation size={7} />
            <span>도착</span>
          </div>
          <span className="text-[9px] text-white/80 font-bold mt-1 bg-slate-900/60 px-1 rounded truncate max-w-[80px]">
            {destCoords.name}
          </span>
        </div>

        {/* Simulation Controls Overlay */}
        <div className="absolute right-3.5 bottom-3.5 flex gap-1.5 z-5">
          {!isSimulating ? (
            <button
              onClick={() => {
                setIsSimulating(true);
                let progress = 0;
                const interval = setInterval(() => {
                  progress += 2;
                  setMockProgress(progress);
                  if (progress >= 100) {
                    clearInterval(interval);
                    setIsSimulating(false);
                    alert('목적지에 도착했습니다! 요금을 확인해 주세요.');
                    setMockProgress(0);
                  }
                }, 150);
                simIntervalRef.current = interval;
              }}
              className="px-2 py-1.5 bg-[#003893] hover:bg-theme-blue/90 border border-white/10 text-white text-[9px] font-bold rounded-xl flex items-center gap-1 active:scale-95 shadow-md transition-all cursor-pointer"
            >
              <Play size={10} fill="white" />
              주행 시뮬레이션
            </button>
          ) : (
            <button
              onClick={stopSimulation}
              className="px-2 py-1.5 bg-red-650 hover:bg-red-600 border border-white/10 text-white text-[9px] font-bold rounded-xl flex items-center gap-1 active:scale-95 shadow-md transition-all cursor-pointer"
            >
              <Square size={10} fill="white" />
              정지
            </button>
          )}
        </div>

        {/* Top Badge: Mock mode indicator */}
        <div className="flex items-center justify-between z-5">
          <span className="text-[9px] font-black bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 rounded-md flex items-center gap-1 animate-pulse">
            <Compass size={10} />
            <span>데모 모드 시뮬레이터</span>
          </span>
        </div>
      </div>
    );
  }

  // Render Map Container
  return (
    <div className="w-full h-44 rounded-xl overflow-hidden border border-theme-border relative shadow-inner">
      <div ref={mapContainerRef} className="w-full h-full" style={{ backgroundColor: '#e0e0e0' }} />
      
      {/* Simulation Controls on Top of Map */}
      <div className="absolute right-3.5 bottom-3.5 flex gap-1.5 z-5">
        {!isSimulating ? (
          <button
            onClick={startSimulation}
            className="px-2.5 py-1.5 bg-[#003893] hover:bg-blue-600 text-white border border-white/10 text-[9px] font-bold rounded-xl flex items-center gap-1 active:scale-95 shadow-md transition-all cursor-pointer"
            style={{ minHeight: '28px' }}
          >
            <Play size={10} fill="white" />
            실시간 주행
          </button>
        ) : (
          <button
            onClick={stopSimulation}
            className="px-2.5 py-1.5 bg-red-600 hover:bg-red-500 text-white border border-white/10 text-[9px] font-bold rounded-xl flex items-center gap-1 active:scale-95 shadow-md transition-all cursor-pointer"
            style={{ minHeight: '28px' }}
          >
            <Square size={10} fill="white" />
            정지
          </button>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { MapPin, Navigation, Compass, AlertCircle, Play, Square } from 'lucide-react';

const naverClientId = process.env.NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID;

const isNaverConfigured = !!(
  naverClientId &&
  naverClientId !== '여기에-네이버-맵-client-id' &&
  !naverClientId.includes('여기에')
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

export default function NaverMap({ departure, destination }) {
  const mapContainerRef = useRef(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [mockProgress, setMockProgress] = useState(0); // 0 to 100 for SVG animation
  
  const mapRef = useRef(null);
  const carMarkerRef = useRef(null);
  const simIntervalRef = useRef(null);

  const depCoords = getCoordinates(departure, LANDMARK_COORDS.station);
  const destCoords = getCoordinates(destination, LANDMARK_COORDS.main_gate);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.naver && window.naver.maps) {
      setScriptLoaded(true);
    }
    return () => stopSimulation();
  }, []);

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

  // Start GPS Simulation
  const startSimulation = () => {
    stopSimulation();
    setIsSimulating(true);

    let progress = 0;
    const steps = 30; // 30 updates
    const intervalMs = 250; // Total 7.5 seconds

    if (!isNaverConfigured || mapError) {
      // SVG Mock Simulation
      simIntervalRef.current = setInterval(() => {
        progress += 100 / steps;
        if (progress >= 100) {
          setMockProgress(100);
          clearInterval(simIntervalRef.current);
          setIsSimulating(false);
        } else {
          setMockProgress(progress);
        }
      }, intervalMs);
      return;
    }

    // Live Naver Map Simulation
    try {
      const naver = window.naver;
      if (!naver || !mapRef.current) return;

      // Create taxi marker icon
      const carMarker = new naver.maps.Marker({
        position: new naver.maps.LatLng(depCoords.lat, depCoords.lng),
        map: mapRef.current,
        title: '택시 이동 중',
        icon: {
          content: `
            <div style="background-color: #f59e0b; color: white; padding: 5px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); width: 34px; height: 34px; display: flex; items-center; justify-content: center; font-size: 16px; animation: bounce 0.5s infinite alternate;">
              🚕
            </div>
          `,
          anchor: new naver.maps.Point(17, 17),
        },
        zIndex: 100,
      });
      carMarkerRef.current = carMarker;

      simIntervalRef.current = setInterval(() => {
        progress += 1;
        const t = progress / steps;

        if (t >= 1) {
          carMarker.setPosition(new naver.maps.LatLng(destCoords.lat, destCoords.lng));
          mapRef.current.panTo(new naver.maps.LatLng(destCoords.lat, destCoords.lng));
          clearInterval(simIntervalRef.current);
          setIsSimulating(false);
          alert('목적지에 도착했습니다! 요금을 확인해 주세요.');
          carMarker.setMap(null);
          carMarkerRef.current = null;
        } else {
          const lat = depCoords.lat + (destCoords.lat - depCoords.lat) * t;
          const lng = depCoords.lng + (destCoords.lng - depCoords.lng) * t;
          const newPos = new naver.maps.LatLng(lat, lng);
          
          carMarker.setPosition(newPos);
          mapRef.current.panTo(newPos);
        }
      }, intervalMs);

    } catch (e) {
      console.error('Simulation error:', e);
      setIsSimulating(false);
    }
  };

  useEffect(() => {
    if (!scriptLoaded || !isNaverConfigured || !mapContainerRef.current) return;

    try {
      const naver = window.naver;
      if (!naver || !naver.maps) return;

      const midLat = (depCoords.lat + destCoords.lat) / 2;
      const midLng = (depCoords.lng + destCoords.lng) / 2;

      const mapOptions = {
        center: new naver.maps.LatLng(midLat, midLng),
        zoom: 13,
        minZoom: 10,
        maxZoom: 17,
        logoControl: true,
        mapDataControl: false,
        zoomControl: true,
        zoomControlOptions: {
          style: naver.maps.ZoomControlStyle.SMALL,
          position: naver.maps.Position.TOP_RIGHT,
        },
      };

      const map = new naver.maps.Map(mapContainerRef.current, mapOptions);
      mapRef.current = map;

      // Departure Marker (Blue)
      new naver.maps.Marker({
        position: new naver.maps.LatLng(depCoords.lat, depCoords.lng),
        map: map,
        title: '출발지: ' + departure,
        icon: {
          content: `
            <div style="display: flex; flex-direction: column; align-items: center;">
              <div style="background-color: #003893; color: white; padding: 4px 10px; border-radius: 12px; font-weight: bold; border: 2px solid white; font-size: 11px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); white-space: nowrap;">
                출발: ${departure || '선택'}
              </div>
              <div style="width: 10px; height: 10px; background-color: #003893; border: 2px solid white; border-radius: 50%; margin-top: -2px;"></div>
            </div>
          `,
          anchor: new naver.maps.Point(40, 30),
        },
      });

      // Destination Marker (Red)
      new naver.maps.Marker({
        position: new naver.maps.LatLng(destCoords.lat, destCoords.lng),
        map: map,
        title: '목적지: ' + destination,
        icon: {
          content: `
            <div style="display: flex; flex-direction: column; align-items: center;">
              <div style="background-color: #ff3b30; color: white; padding: 4px 10px; border-radius: 12px; font-weight: bold; border: 2px solid white; font-size: 11px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); white-space: nowrap;">
                도착: ${destination || '선택'}
              </div>
              <div style="width: 10px; height: 10px; background-color: #ff3b30; border: 2px solid white; border-radius: 50%; margin-top: -2px;"></div>
            </div>
          `,
          anchor: new naver.maps.Point(40, 30),
        },
      });

      // Polyline Path
      new naver.maps.Polyline({
        map: map,
        path: [
          new naver.maps.LatLng(depCoords.lat, depCoords.lng),
          new naver.maps.LatLng(destCoords.lat, destCoords.lng),
        ],
        strokeColor: '#003893',
        strokeWeight: 4,
        strokeOpacity: 0.8,
        strokeStyle: 'dash',
      });

      // Bounds fit
      const bounds = new naver.maps.LatLngBounds(
        new naver.maps.LatLng(
          Math.min(depCoords.lat, destCoords.lat) - 0.005,
          Math.min(depCoords.lng, destCoords.lng) - 0.005
        ),
        new naver.maps.LatLng(
          Math.max(depCoords.lat, destCoords.lat) + 0.005,
          Math.max(depCoords.lng, destCoords.lng) + 0.005
        )
      );
      map.fitBounds(bounds);

    } catch (e) {
      console.error('Failed to render Naver Map:', e);
      setMapError(true);
    }
  }, [scriptLoaded, departure, destination, depCoords.lat, depCoords.lng, destCoords.lat, destCoords.lng]);

  const handleScriptLoad = () => {
    setScriptLoaded(true);
  };

  // Render Mock fallback if Naver is not configured
  if (!isNaverConfigured || mapError) {
    // Interpolate coords for Mock SVG Animation
    const mockCarX = 20 + (80 - 20) * (mockProgress / 100);
    const mockCarY = 70 + (30 - 70) * (mockProgress / 100);

    return (
      <div className="w-full h-44 bg-slate-800 rounded-xl relative overflow-hidden border border-slate-700 flex flex-col justify-between p-3 select-none">
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:20px_20px]"></div>
        
        {/* Mock Path Line */}
        <svg className="absolute inset-0 w-full h-full p-6 pointer-events-none">
          <line
            x1="20%"
            y1="70%"
            x2="80%"
            y2="30%"
            stroke="#3b82f6"
            strokeWidth="3"
            strokeDasharray="6 6"
          />
        </svg>

        {/* Moving Taxi Car on SVG (if simulating) */}
        {isSimulating && (
          <div
            className="absolute z-30 transition-all duration-200"
            style={{
              left: `calc(${mockCarX}% - 14px)`,
              top: `calc(${mockCarY}% - 14px)`,
            }}
          >
            <div className="bg-amber-500 rounded-full w-7 h-7 flex items-center justify-center border-2 border-white text-xs shadow-lg animate-bounce">
              🚕
            </div>
          </div>
        )}

        {/* Departure marker */}
        <div className="absolute left-[16%] bottom-[20%] flex flex-col items-center z-10">
          <div className="bg-[#003893] text-white text-[10px] px-2 py-0.5 rounded-full font-bold border border-white whitespace-nowrap">
            {departure || '출발'}
          </div>
          <div className="w-3 h-3 bg-[#003893] border-2 border-white rounded-full mt-0.5 shadow-md"></div>
        </div>

        {/* Destination marker */}
        <div className="absolute right-[16%] top-[20%] flex flex-col items-center z-10">
          <div className="bg-[#ff3b30] text-white text-[10px] px-2 py-0.5 rounded-full font-bold border border-white whitespace-nowrap">
            {destination || '도착'}
          </div>
          <div className="w-3 h-3 bg-[#ff3b30] border-2 border-white rounded-full mt-0.5 shadow-md"></div>
        </div>

        {/* Simulator button for mock mode */}
        <button
          type="button"
          onClick={isSimulating ? stopSimulation : startSimulation}
          className="absolute right-3 bottom-3 bg-white/20 hover:bg-white/30 backdrop-blur text-white text-[10px] font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 z-30 transition-colors"
          style={{ minHeight: '32px' }}
        >
          {isSimulating ? <Square size={10} fill="white" /> : <Play size={10} fill="white" />}
          {isSimulating ? '정지' : '🚗 위치 시뮬레이터'}
        </button>

        <div className="bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg p-2 flex items-start gap-1 z-20 w-fit max-w-[70%]">
          <AlertCircle size={12} className="text-yellow-400 shrink-0 mt-0.5" />
          <span className="text-[9px] text-gray-300 leading-tight">
            네이버 지도 연동 시 실지도로 전환됩니다.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-44 rounded-xl overflow-hidden border border-gray-150 relative shadow-sm">
      <Script
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${naverClientId}`}
        onLoad={handleScriptLoad}
        strategy="afterInteractive"
      />
      
      <div ref={mapContainerRef} className="w-full h-full bg-gray-50" />
      
      {!scriptLoaded && (
        <div className="absolute inset-0 bg-gray-150/40 backdrop-blur-sm flex items-center justify-center">
          <span className="w-5 h-5 border-2 border-[#003893] border-t-transparent rounded-full animate-spin"></span>
        </div>
      )}

      {/* Floating Simulation control overlay for Naver Map */}
      {scriptLoaded && (
        <button
          type="button"
          onClick={isSimulating ? stopSimulation : startSimulation}
          className="absolute left-3 bottom-3 bg-white hover:bg-gray-50 text-gray-700 text-[10px] font-bold py-1.5 px-2.5 rounded-lg flex items-center gap-1 shadow-md z-30 transition-colors border border-gray-200"
          style={{ minHeight: '32px' }}
        >
          {isSimulating ? <Square size={10} className="text-red-500" fill="currentColor" /> : <Play size={10} className="text-green-600" fill="currentColor" />}
          {isSimulating ? '정지' : '🚗 위치 시뮬레이션'}
        </button>
      )}
    </div>
  );
}

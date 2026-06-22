'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { MapPin, Navigation, Compass, AlertCircle } from 'lucide-react';

const naverClientId = process.env.NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID;

// Check if Naver Maps is configured and is not the placeholder string
const isNaverConfigured = !!(
  naverClientId &&
  naverClientId !== '여기에-네이버-맵-client-id' &&
  !naverClientId.includes('여기에')
);

// GPS coordinates of Daejin University landmarks
const LANDMARK_COORDS = {
  main_gate: { lat: 37.896245, lng: 127.186847, name: '대진대 정문' },
  station: { lat: 37.875184, lng: 127.156525, name: '대진대역 1번출구' },
  terminal: { lat: 37.894812, lng: 127.206691, name: '포천터미널' },
  uijeongbu: { lat: 37.738411, lng: 127.045934, name: '의정부역' },
  engineering_bldg: { lat: 37.899120, lng: 127.183492, name: '대진대 공학관' },
};

// Substring matching to find corresponding coordinates
const getCoordinates = (locationName, defaultCoords) => {
  if (!locationName) return defaultCoords;
  const name = locationName.toLowerCase();
  
  if (name.includes('정문')) return LANDMARK_COORDS.main_gate;
  if (name.includes('역') || name.includes('선단')) return LANDMARK_COORDS.station;
  if (name.includes('터미널') || name.includes('포천터')) return LANDMARK_COORDS.terminal;
  if (name.includes('의정부')) return LANDMARK_COORDS.uijeongbu;
  if (name.includes('공학') || name.includes('대학') || name.includes('관')) return LANDMARK_COORDS.engineering_bldg;
  
  return defaultCoords;
};

export default function NaverMap({ departure, destination }) {
  const mapContainerRef = useRef(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const mapRef = useRef(null);

  // Coordinate resolution
  const depCoords = getCoordinates(departure, LANDMARK_COORDS.station);
  const destCoords = getCoordinates(destination, LANDMARK_COORDS.main_gate);

  useEffect(() => {
    // Check if Naver Maps API script is already loaded globally
    if (typeof window !== 'undefined' && window.naver && window.naver.maps) {
      setScriptLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !isNaverConfigured || !mapContainerRef.current) return;

    try {
      const naver = window.naver;
      if (!naver || !naver.maps) return;

      const midLat = (depCoords.lat + destCoords.lat) / 2;
      const midLng = (depCoords.lng + destCoords.lng) / 2;

      // Initialize Map
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

      // Add Departure Marker (Blue)
      const depMarker = new naver.maps.Marker({
        position: new naver.maps.LatLng(depCoords.lat, depCoords.lng),
        map: map,
        title: '출발지: ' + departure,
        icon: {
          content: `
            <div style="display: flex; flex-direction: column; align-items: center;">
              <div style="background-color: #003893; color: white; padding: 4px 10px; border-radius: 12px; font-weight: bold; border: 2.5px solid white; font-size: 11px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); white-space: nowrap;">
                출발: ${departure || '선택'}
              </div>
              <div style="width: 10px; height: 10px; background-color: #003893; border: 2px solid white; border-radius: 50%; margin-top: -2px;"></div>
            </div>
          `,
          anchor: new naver.maps.Point(40, 30),
        },
      });

      // Add Destination Marker (Red)
      const destMarker = new naver.maps.Marker({
        position: new naver.maps.LatLng(destCoords.lat, destCoords.lng),
        map: map,
        title: '목적지: ' + destination,
        icon: {
          content: `
            <div style="display: flex; flex-direction: column; align-items: center;">
              <div style="background-color: #ff3b30; color: white; padding: 4px 10px; border-radius: 12px; font-weight: bold; border: 2.5px solid white; font-size: 11px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); white-space: nowrap;">
                도착: ${destination || '선택'}
              </div>
              <div style="width: 10px; height: 10px; background-color: #ff3b30; border: 2px solid white; border-radius: 50%; margin-top: -2px;"></div>
            </div>
          `,
          anchor: new naver.maps.Point(40, 30),
        },
      });

      // Draw Polyline Path between points
      const pathLine = new naver.maps.Polyline({
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

      // Fit map bounds to show both markers
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

  // Mock Map Vector Rendering (If keys are not configured or error occurs)
  if (!isNaverConfigured || mapError) {
    return (
      <div className="w-full h-44 bg-slate-800 rounded-xl relative overflow-hidden border border-slate-700 flex flex-col justify-between p-3 select-none">
        
        {/* Mock Map Grid lines */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:20px_20px]"></div>
        
        {/* Mock Route Polyline */}
        <svg className="absolute inset-0 w-full h-full p-6">
          <line
            x1="20%"
            y1="70%"
            x2="80%"
            y2="30%"
            stroke="#3b82f6"
            strokeWidth="3"
            strokeDasharray="6 6"
            className="animate-[dash_2s_linear_infinite]"
          />
        </svg>

        {/* Departure Mock Node */}
        <div className="absolute left-[16%] bottom-[20%] flex flex-col items-center z-10">
          <div className="bg-[#003893] text-white text-[10px] px-2 py-0.5 rounded-full font-bold border border-white whitespace-nowrap">
            {departure || '출발'}
          </div>
          <div className="w-3 h-3 bg-[#003893] border-2 border-white rounded-full mt-0.5 shadow-md"></div>
        </div>

        {/* Destination Mock Node */}
        <div className="absolute right-[16%] top-[20%] flex flex-col items-center z-10">
          <div className="bg-[#ff3b30] text-white text-[10px] px-2 py-0.5 rounded-full font-bold border border-white whitespace-nowrap">
            {destination || '도착'}
          </div>
          <div className="w-3 h-3 bg-[#ff3b30] border-2 border-white rounded-full mt-0.5 shadow-md"></div>
        </div>

        {/* Alert & Config Notice */}
        <div className="bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg p-2.5 flex items-start gap-1.5 z-20 mt-auto">
          <AlertCircle size={14} className="text-yellow-400 shrink-0 mt-0.5" />
          <div className="text-[10px] text-gray-300 leading-normal font-medium">
            <strong>지도 프리뷰 활성화:</strong> <code>.env.local</code> 파일에 <code>NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID</code>를 추가하면 라이브 네이버 지도로 즉시 자동 교체됩니다.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-44 rounded-xl overflow-hidden border border-gray-150 relative shadow-sm">
      {/* Naver Maps script loading */}
      <Script
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${naverClientId}`}
        onLoad={handleScriptLoad}
        strategy="afterInteractive"
      />
      
      {/* Map DOM Container */}
      <div ref={mapContainerRef} className="w-full h-full bg-gray-50" />
      
      {!scriptLoaded && (
        <div className="absolute inset-0 bg-gray-150/40 backdrop-blur-sm flex items-center justify-center">
          <span className="w-5 h-5 border-2 border-[#003893] border-t-transparent rounded-full animate-spin"></span>
        </div>
      )}
    </div>
  );
}

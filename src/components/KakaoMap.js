'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Compass, Play, Square } from 'lucide-react';

const kakaoAppKey = process.env.NEXT_PUBLIC_KAKAO_MAPS_APP_KEY || '2c63d05e29a82802c023313a723a8c65';

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
  const leafletMapContainerRef = useRef(null);
  
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [routePath, setRoutePath] = useState([]); // Array of { lat, lng }
  
  const [leafletL, setLeafletL] = useState(null);

  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  
  const carMarkerRef = useRef(null); // Kakao Overlay Ref
  const leafletCarMarkerRef = useRef(null); // Leaflet Marker Ref
  
  const simIntervalRef = useRef(null);

  const depCoords = getCoordinates(departure, LANDMARK_COORDS.station);
  const destCoords = getCoordinates(destination, LANDMARK_COORDS.main_gate);

  const isLeafletMode = !isKakaoConfigured || mapError;

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
    if (leafletCarMarkerRef.current) {
      leafletCarMarkerRef.current.remove();
      leafletCarMarkerRef.current = null;
    }
  };

  // Fetch route coordinates
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

  // Kakao Script loading poller
  useEffect(() => {
    if (isKakaoConfigured) {
      if (typeof window !== 'undefined') {
        if (window.kakao && window.kakao.maps) {
          setTimeout(() => setScriptLoaded(true), 0);
        } else {
          const interval = setInterval(() => {
            if (window.kakao && window.kakao.maps) {
              setTimeout(() => setScriptLoaded(true), 0);
              clearInterval(interval);
            }
          }, 150);
          
          const timeout = setTimeout(() => {
            clearInterval(interval);
          }, 10000);
          
          return () => {
            clearInterval(interval);
            clearTimeout(timeout);
            stopSimulation();
          };
        }
      }
    }
    return () => stopSimulation();
  }, []);

  // Leaflet Dynamic Loading
  useEffect(() => {
    if (isLeafletMode) {
      const loadLeaflet = async () => {
        try {
          if (!document.getElementById('leaflet-css')) {
            const link = document.createElement('link');
            link.id = 'leaflet-css';
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
          }
          const L = await import('leaflet');
          setLeafletL(L);
        } catch (e) {
          console.error('Failed to load Leaflet:', e);
        }
      };
      loadLeaflet();
    }
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [isLeafletMode]);

  // Kakao Map rendering
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
          level: 5
        };

        const map = new kakao.maps.Map(container, mapOptions);
        mapRef.current = map;

        // Start marker
        new kakao.maps.Marker({
          position: new kakao.maps.LatLng(depCoords.lat, depCoords.lng),
          map: map
        });

        // End marker
        new kakao.maps.Marker({
          position: new kakao.maps.LatLng(destCoords.lat, destCoords.lng),
          map: map
        });

        // Path Polyline
        const kakaoPath = routePath.map(pt => new kakao.maps.LatLng(pt.lat, pt.lng));
        const polyline = new kakao.maps.Polyline({
          path: kakaoPath,
          strokeWeight: 5,
          strokeColor: '#003893',
          strokeOpacity: 0.8,
          strokeStyle: 'solid'
        });
        polyline.setMap(map);

        // Fit bounds
        const bounds = new kakao.maps.LatLngBounds();
        kakaoPath.forEach(latlng => bounds.extend(latlng));
        map.setBounds(bounds);

      } catch (e) {
        console.error('Failed to render Kakao Map:', e);
        setTimeout(() => setMapError(true), 0);
      }
    });
  }, [scriptLoaded, departure, destination, depCoords.lat, depCoords.lng, destCoords.lat, destCoords.lng, routePath]);

  // Leaflet Map rendering
  useEffect(() => {
    if (!isLeafletMode || !leafletL || !leafletMapContainerRef.current || routePath.length === 0) return;

    try {
      const L = leafletL;
      
      // Clean up previous instance
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
      }

      const midLat = (depCoords.lat + destCoords.lat) / 2;
      const midLng = (depCoords.lng + destCoords.lng) / 2;

      const map = L.map(leafletMapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([midLat, midLng], 13);
      
      leafletMapRef.current = map;

      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

      // Start Marker
      L.marker([depCoords.lat, depCoords.lng]).addTo(map);

      // Destination Marker
      L.marker([destCoords.lat, destCoords.lng]).addTo(map);

      // Polyline path
      const latlngs = routePath.map(pt => [pt.lat, pt.lng]);
      const polyline = L.polyline(latlngs, {
        color: '#003893',
        weight: 5,
        opacity: 0.8
      }).addTo(map);

      // Fit bounds
      map.fitBounds(polyline.getBounds(), { padding: [20, 20] });

    } catch (e) {
      console.error('Leaflet Map rendering failed:', e);
    }
  }, [isLeafletMode, leafletL, routePath, depCoords, destCoords]);

  // Kakao T Live GPS Simulation
  const startSimulation = () => {
    stopSimulation();
    setIsSimulating(true);

    const pathPoints = routePath.length > 0 ? routePath : [
      { lat: depCoords.lat, lng: depCoords.lng },
      { lat: destCoords.lat, lng: destCoords.lng }
    ];

    const kakao = window.kakao;
    if (kakao && kakao.maps && mapRef.current) {
      const startPt = pathPoints[0];
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

  // Leaflet GPS Simulation
  const startLeafletSimulation = () => {
    stopSimulation();
    setIsSimulating(true);

    const pathPoints = routePath.length > 0 ? routePath : [
      { lat: depCoords.lat, lng: depCoords.lng },
      { lat: destCoords.lat, lng: destCoords.lng }
    ];

    const L = leafletL;
    if (L && leafletMapRef.current) {
      const startPt = pathPoints[0];
      const taxiIcon = L.divIcon({
        html: `<div style="background-color: #f59e0b; color: white; padding: 5px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; font-size: 16px;">🚕</div>`,
        className: 'leaflet-taxi-icon',
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      const carMarker = L.marker([startPt.lat, startPt.lng], { icon: taxiIcon }).addTo(leafletMapRef.current);
      leafletCarMarkerRef.current = carMarker;

      let progress = 0;
      const steps = Math.max(30, pathPoints.length * 3);
      const intervalMs = Math.max(100, Math.floor(7500 / steps));
      const totalPoints = pathPoints.length;

      simIntervalRef.current = setInterval(() => {
        progress += 1;
        const t = progress / steps;

        if (t >= 1) {
          const destPt = pathPoints[totalPoints - 1];
          carMarker.setLatLng([destPt.lat, destPt.lng]);
          leafletMapRef.current.panTo([destPt.lat, destPt.lng]);
          clearInterval(simIntervalRef.current);
          setIsSimulating(false);
          alert('목적지에 도착했습니다! 요금을 확인해 주세요.');
          carMarker.remove();
          leafletCarMarkerRef.current = null;
        } else {
          const rawIndex = t * (totalPoints - 1);
          const segmentIndex = Math.floor(rawIndex);
          const segmentT = rawIndex - segmentIndex;

          const p1 = pathPoints[segmentIndex];
          const p2 = pathPoints[segmentIndex + 1];

          if (p1 && p2) {
            const lat = p1.lat + (p2.lat - p1.lat) * segmentT;
            const lng = p1.lng + (p2.lng - p1.lng) * segmentT;
            
            carMarker.setLatLng([lat, lng]);
            leafletMapRef.current.panTo([lat, lng]);
          }
        }
      }, intervalMs);
    }
  };

  return (
    <div className="w-full h-44 rounded-xl overflow-hidden border border-theme-border relative shadow-inner">
      {/* Map rendering layer */}
      {isLeafletMode ? (
        <div ref={leafletMapContainerRef} className="w-full h-full animate-fade-in" style={{ backgroundColor: '#e5e7eb' }} />
      ) : (
        <div ref={mapContainerRef} className="w-full h-full animate-fade-in" style={{ backgroundColor: '#e5e7eb' }} />
      )}

      {/* Demo map overlay badge */}
      {isLeafletMode && (
        <div className="absolute left-3.5 top-3.5 z-[1000] flex items-center gap-1 select-none pointer-events-none">
          <span className="text-[9px] font-black bg-yellow-500/10 text-yellow-600 backdrop-blur-md border border-yellow-500/30 px-2 py-0.5 rounded-md flex items-center gap-1 animate-pulse">
            <Compass size={10} />
            <span>데모 모드 (실제 지도)</span>
          </span>
        </div>
      )}

      {/* Simulation Controls on Top of Map */}
      <div className="absolute right-3.5 bottom-3.5 flex gap-1.5 z-[1000]">
        {!isSimulating ? (
          <button
            onClick={isLeafletMode ? startLeafletSimulation : startSimulation}
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

import { NextResponse } from 'next/server';

const LANDMARKS = [
  { name: 'station', lat: 37.875184, lng: 127.156525 },
  { name: 'main_gate', lat: 37.896245, lng: 127.186847 },
  { name: 'engineering_bldg', lat: 37.899120, lng: 127.183492 },
  { name: 'terminal', lat: 37.894812, lng: 127.206691 },
  { name: 'uijeongbu', lat: 37.738411, lng: 127.045934 }
];

const PRESET_PATHS = {
  // station <-> main_gate
  'station-main_gate': [
    { lat: 37.875184, lng: 127.156525 },
    { lat: 37.878500, lng: 127.161000 },
    { lat: 37.882000, lng: 127.165500 },
    { lat: 37.886000, lng: 127.170000 },
    { lat: 37.890000, lng: 127.175000 },
    { lat: 37.892500, lng: 127.178500 },
    { lat: 37.894200, lng: 127.182000 },
    { lat: 37.896245, lng: 127.186847 }
  ],
  'main_gate-station': [
    { lat: 37.896245, lng: 127.186847 },
    { lat: 37.894200, lng: 127.182000 },
    { lat: 37.892500, lng: 127.178500 },
    { lat: 37.890000, lng: 127.175000 },
    { lat: 37.886000, lng: 127.170000 },
    { lat: 37.882000, lng: 127.165500 },
    { lat: 37.878500, lng: 127.161000 },
    { lat: 37.875184, lng: 127.156525 }
  ],
  // station <-> engineering_bldg
  'station-engineering_bldg': [
    { lat: 37.875184, lng: 127.156525 },
    { lat: 37.878500, lng: 127.161000 },
    { lat: 37.882000, lng: 127.165500 },
    { lat: 37.886000, lng: 127.170000 },
    { lat: 37.890000, lng: 127.175000 },
    { lat: 37.892500, lng: 127.178500 },
    { lat: 37.894200, lng: 127.182000 },
    { lat: 37.896245, lng: 127.186847 },
    { lat: 37.897200, lng: 127.185500 },
    { lat: 37.898000, lng: 127.184200 },
    { lat: 37.899120, lng: 127.183492 }
  ],
  'engineering_bldg-station': [
    { lat: 37.899120, lng: 127.183492 },
    { lat: 37.898000, lng: 127.184200 },
    { lat: 37.897200, lng: 127.185500 },
    { lat: 37.896245, lng: 127.186847 },
    { lat: 37.894200, lng: 127.182000 },
    { lat: 37.892500, lng: 127.178500 },
    { lat: 37.890000, lng: 127.175000 },
    { lat: 37.886000, lng: 127.170000 },
    { lat: 37.882000, lng: 127.165500 },
    { lat: 37.878500, lng: 127.161000 },
    { lat: 37.875184, lng: 127.156525 }
  ],
  // main_gate <-> engineering_bldg
  'main_gate-engineering_bldg': [
    { lat: 37.896245, lng: 127.186847 },
    { lat: 37.897200, lng: 127.185500 },
    { lat: 37.898000, lng: 127.184200 },
    { lat: 37.899120, lng: 127.183492 }
  ],
  'engineering_bldg-main_gate': [
    { lat: 37.899120, lng: 127.183492 },
    { lat: 37.898000, lng: 127.184200 },
    { lat: 37.897200, lng: 127.185500 },
    { lat: 37.896245, lng: 127.186847 }
  ],
  // terminal <-> main_gate
  'terminal-main_gate': [
    { lat: 37.894812, lng: 127.206691 },
    { lat: 37.893500, lng: 127.200000 },
    { lat: 37.892800, lng: 127.190000 },
    { lat: 37.892500, lng: 127.178500 },
    { lat: 37.894200, lng: 127.182000 },
    { lat: 37.896245, lng: 127.186847 }
  ],
  'main_gate-terminal': [
    { lat: 37.896245, lng: 127.186847 },
    { lat: 37.894200, lng: 127.182000 },
    { lat: 37.892500, lng: 127.178500 },
    { lat: 37.892800, lng: 127.190000 },
    { lat: 37.893500, lng: 127.200000 },
    { lat: 37.894812, lng: 127.206691 }
  ],
  // terminal <-> engineering_bldg
  'terminal-engineering_bldg': [
    { lat: 37.894812, lng: 127.206691 },
    { lat: 37.893500, lng: 127.200000 },
    { lat: 37.892800, lng: 127.190000 },
    { lat: 37.892500, lng: 127.178500 },
    { lat: 37.894200, lng: 127.182000 },
    { lat: 37.896245, lng: 127.186847 },
    { lat: 37.897200, lng: 127.185500 },
    { lat: 37.898000, lng: 127.184200 },
    { lat: 37.899120, lng: 127.183492 }
  ],
  'engineering_bldg-terminal': [
    { lat: 37.899120, lng: 127.183492 },
    { lat: 37.898000, lng: 127.184200 },
    { lat: 37.897200, lng: 127.185500 },
    { lat: 37.896245, lng: 127.186847 },
    { lat: 37.894200, lng: 127.182000 },
    { lat: 37.892500, lng: 127.178500 },
    { lat: 37.892800, lng: 127.190000 },
    { lat: 37.893500, lng: 127.200000 },
    { lat: 37.894812, lng: 127.206691 }
  ],
  // uijeongbu <-> main_gate
  'uijeongbu-main_gate': [
    { lat: 37.738411, lng: 127.045934 },
    { lat: 37.750000, lng: 127.060000 },
    { lat: 37.770000, lng: 127.075000 },
    { lat: 37.790000, lng: 127.090000 },
    { lat: 37.810000, lng: 127.105000 },
    { lat: 37.830000, lng: 127.120000 },
    { lat: 37.850000, lng: 127.135000 },
    { lat: 37.870000, lng: 127.150000 },
    { lat: 37.875184, lng: 127.156525 },
    { lat: 37.878500, lng: 127.161000 },
    { lat: 37.882000, lng: 127.165500 },
    { lat: 37.886000, lng: 127.170000 },
    { lat: 37.890000, lng: 127.175000 },
    { lat: 37.892500, lng: 127.178500 },
    { lat: 37.894200, lng: 127.182000 },
    { lat: 37.896245, lng: 127.186847 }
  ],
  'main_gate-uijeongbu': [
    { lat: 37.896245, lng: 127.186847 },
    { lat: 37.894200, lng: 127.182000 },
    { lat: 37.892500, lng: 127.178500 },
    { lat: 37.890000, lng: 127.175000 },
    { lat: 37.886000, lng: 127.170000 },
    { lat: 37.882000, lng: 127.165500 },
    { lat: 37.878500, lng: 127.161000 },
    { lat: 37.875184, lng: 127.156525 },
    { lat: 37.870000, lng: 127.150000 },
    { lat: 37.850000, lng: 127.135000 },
    { lat: 37.830000, lng: 127.120000 },
    { lat: 37.810000, lng: 127.105000 },
    { lat: 37.790000, lng: 127.090000 },
    { lat: 37.770000, lng: 127.075000 },
    { lat: 37.750000, lng: 127.060000 },
    { lat: 37.738411, lng: 127.045934 }
  ],
  // uijeongbu <-> engineering_bldg
  'uijeongbu-engineering_bldg': [
    { lat: 37.738411, lng: 127.045934 },
    { lat: 37.750000, lng: 127.060000 },
    { lat: 37.770000, lng: 127.075000 },
    { lat: 37.790000, lng: 127.090000 },
    { lat: 37.810000, lng: 127.105000 },
    { lat: 37.830000, lng: 127.120000 },
    { lat: 37.850000, lng: 127.135000 },
    { lat: 37.870000, lng: 127.150000 },
    { lat: 37.875184, lng: 127.156525 },
    { lat: 37.878500, lng: 127.161000 },
    { lat: 37.882000, lng: 127.165500 },
    { lat: 37.886000, lng: 127.170000 },
    { lat: 37.890000, lng: 127.175000 },
    { lat: 37.892500, lng: 127.178500 },
    { lat: 37.894200, lng: 127.182000 },
    { lat: 37.896245, lng: 127.186847 },
    { lat: 37.897200, lng: 127.185500 },
    { lat: 37.898000, lng: 127.184200 },
    { lat: 37.899120, lng: 127.183492 }
  ],
  'engineering_bldg-uijeongbu': [
    { lat: 37.899120, lng: 127.183492 },
    { lat: 37.898000, lng: 127.184200 },
    { lat: 37.897200, lng: 127.185500 },
    { lat: 37.896245, lng: 127.186847 },
    { lat: 37.894200, lng: 127.182000 },
    { lat: 37.892500, lng: 127.178500 },
    { lat: 37.890000, lng: 127.175000 },
    { lat: 37.886000, lng: 127.170000 },
    { lat: 37.882000, lng: 127.165500 },
    { lat: 37.878500, lng: 127.161000 },
    { lat: 37.875184, lng: 127.156525 },
    { lat: 37.870000, lng: 127.150000 },
    { lat: 37.850000, lng: 127.135000 },
    { lat: 37.830000, lng: 127.120000 },
    { lat: 37.810000, lng: 127.105000 },
    { lat: 37.790000, lng: 127.090000 },
    { lat: 37.770000, lng: 127.075000 },
    { lat: 37.750000, lng: 127.060000 },
    { lat: 37.738411, lng: 127.045934 }
  ]
};

function findClosestLandmark(lat, lng) {
  let closest = null;
  let minDistance = Infinity;
  for (const landmark of LANDMARKS) {
    const dist = Math.sqrt(Math.pow(lat - landmark.lat, 2) + Math.pow(lng - landmark.lng, 2));
    if (dist < minDistance) {
      minDistance = dist;
      closest = landmark;
    }
  }
  return { landmark: closest, distance: minDistance };
}

const MOCK_FARES = {
  'station-main_gate': { distance: '4.5km', fare: 7500, duration: '8분' },
  'main_gate-station': { distance: '4.5km', fare: 7500, duration: '8분' },
  'station-engineering_bldg': { distance: '5.2km', fare: 8300, duration: '10분' },
  'engineering_bldg-station': { distance: '5.2km', fare: 8300, duration: '10분' },
  'main_gate-engineering_bldg': { distance: '1.2km', fare: 4800, duration: '3분' },
  'engineering_bldg-main_gate': { distance: '1.2km', fare: 4800, duration: '3분' },
  'terminal-main_gate': { distance: '6.8km', fare: 10200, duration: '12분' },
  'main_gate-terminal': { distance: '6.8km', fare: 10200, duration: '12분' },
  'terminal-engineering_bldg': { distance: '7.5km', fare: 11000, duration: '14분' },
  'engineering_bldg-terminal': { distance: '7.5km', fare: 11000, duration: '14분' },
  'uijeongbu-main_gate': { distance: '17.5km', fare: 23500, duration: '25분' },
  'main_gate-uijeongbu': { distance: '17.5km', fare: 23500, duration: '25분' },
  'uijeongbu-engineering_bldg': { distance: '18.2km', fare: 24300, duration: '27분' },
  'engineering_bldg-uijeongbu': { distance: '18.2km', fare: 24300, duration: '27분' },
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get('start'); // "lng,lat"
  const goal = searchParams.get('goal');   // "lng,lat"

  if (!start || !goal) {
    return NextResponse.json({ error: 'Missing start or goal parameters' }, { status: 400 });
  }

  try {
    const [startLng, startLat] = start.split(',').map(Number);
    const [goalLng, goalLat] = goal.split(',').map(Number);

    const restApiKey = process.env.KAKAO_REST_API_KEY;

    // 1. If KAKAO_REST_API_KEY is available, try the real Kakao Mobility Directions API
    if (restApiKey && restApiKey !== '여기에-카카오-모빌리티-rest-api-키' && !restApiKey.includes('여기에')) {
      const url = `https://apis-navi.kakaomobility.com/v1/directions?origin=${startLng},${startLat}&destination=${goalLng},${goalLat}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `KakaoAK ${restApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.routes && data.routes[0]) {
          const route = data.routes[0];
          
          // Parse coordinates from sections/roads
          const path = [];
          if (route.sections) {
            route.sections.forEach(section => {
              if (section.roads) {
                section.roads.forEach(road => {
                  if (road.vertexes) {
                    for (let i = 0; i < road.vertexes.length; i += 2) {
                      const lng = road.vertexes[i];
                      const lat = road.vertexes[i + 1];
                      path.push({ lat, lng });
                    }
                  }
                });
              }
            });
          }
          
          // Extract fare and details
          const taxiFare = route.summary?.fare?.taxi || 8000;
          const distance = route.summary?.distance || 5000; // in meters
          const duration = route.summary?.duration || 600; // in seconds

          return NextResponse.json({ 
            path, 
            taxiFare, 
            distance: (distance / 1000).toFixed(1) + 'km',
            duration: Math.round(duration / 60) + '분'
          });
        }
      }
    }

    // 1.5. OSRM driving directions keyless fallback
    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${goalLng},${goalLat}?overview=full&geometries=geojson`;
      const osrmResponse = await fetch(osrmUrl);
      if (osrmResponse.ok) {
        const osrmData = await osrmResponse.json();
        if (osrmData.routes && osrmData.routes[0]) {
          const route = osrmData.routes[0];
          const coordinates = route.geometry.coordinates; // [[lng, lat], [lng, lat], ...]
          const path = coordinates.map(([lng, lat]) => ({ lat, lng }));

          const distance = route.distance || 5000; // in meters
          const duration = route.duration || 600; // in seconds

          // Standard Korean Taxi Rate formula
          const baseFare = 4800;
          const distanceFare = Math.max(0, distance - 1600) / 131 * 100;
          const taxiFare = Math.round((baseFare + distanceFare) / 100) * 100;

          return NextResponse.json({
            path,
            taxiFare,
            distance: (distance / 1000).toFixed(1) + 'km',
            duration: Math.round(duration / 60) + '분'
          });
        }
      }
    } catch (osrmError) {
      console.error('OSRM route fetch failed, trying presets:', osrmError);
    }

    // 2. Fallback to predefined road-snapped paths for landmark presets
    const closestStart = findClosestLandmark(startLat, startLng);
    const closestGoal = findClosestLandmark(goalLat, goalLng);

    if (closestStart.distance < 0.003 && closestGoal.distance < 0.003) {
      const key = `${closestStart.landmark.name}-${closestGoal.landmark.name}`;
      if (PRESET_PATHS[key]) {
        const fallbackData = MOCK_FARES[key] || { distance: '5.0km', fare: 8000, duration: '10분' };
        return NextResponse.json({ 
          path: PRESET_PATHS[key],
          taxiFare: fallbackData.fare,
          distance: fallbackData.distance,
          duration: fallbackData.duration
        });
      }
    }

    // 3. Fallback for custom locations (generate curved dog-leg points to mimic streets)
    const path = [
      { lat: startLat, lng: startLng },
      { 
        lat: startLat + (goalLat - startLat) * 0.3 + (goalLng - startLng) * 0.06, 
        lng: startLng + (goalLng - startLng) * 0.3 - (goalLat - startLat) * 0.06 
      },
      { 
        lat: startLat + (goalLat - startLat) * 0.7 - (goalLng - startLng) * 0.03, 
        lng: startLng + (goalLng - startLng) * 0.7 + (goalLat - startLat) * 0.03 
      },
      { lat: goalLat, lng: goalLng }
    ];

    return NextResponse.json({ 
      path,
      taxiFare: 8000,
      distance: '5.0km',
      duration: '10분'
    });

  } catch (error) {
    console.error('Error in directions API route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

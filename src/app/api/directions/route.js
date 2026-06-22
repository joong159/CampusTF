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

    const clientId = process.env.NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID || 'e4er7uvr2b';
    const clientSecret = process.env.NAVER_MAPS_CLIENT_SECRET;

    // 1. If NAVER_MAPS_CLIENT_SECRET is available, try the real Directions API
    if (clientSecret && clientSecret !== '여기에-네이버-맵-client-secret') {
      const url = `https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving?start=${startLng},${startLat}&goal=${goalLng},${goalLat}&option=trafast`;
      
      const response = await fetch(url, {
        headers: {
          'X-NCP-APIGW-API-KEY-ID': clientId,
          'X-NCP-APIGW-API-KEY': clientSecret
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.route && data.route.trafast && data.route.trafast[0]) {
          const naverPath = data.route.trafast[0].path;
          const path = naverPath.map(([lng, lat]) => ({ lat, lng }));
          return NextResponse.json({ path });
        }
      }
    }

    // 2. Fallback to predefined road-snapped paths for landmark presets
    const closestStart = findClosestLandmark(startLat, startLng);
    const closestGoal = findClosestLandmark(goalLat, goalLng);

    if (closestStart.distance < 0.003 && closestGoal.distance < 0.003) {
      const key = `${closestStart.landmark.name}-${closestGoal.landmark.name}`;
      if (PRESET_PATHS[key]) {
        return NextResponse.json({ path: PRESET_PATHS[key] });
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

    return NextResponse.json({ path });

  } catch (error) {
    console.error('Error in directions API route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

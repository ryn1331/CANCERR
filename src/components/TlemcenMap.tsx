import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const COMMUNE_COORDS: Record<string, [number, number]> = {
  'Tlemcen': [34.8828, -1.3167],
  'Mansourah': [34.8600, -1.3300],
  'Chetouane': [34.9100, -1.2900],
  'Remchi': [35.0600, -1.4300],
  'Ghazaouet': [35.1000, -1.8600],
  'Maghnia': [34.8500, -1.7400],
  'Sebdou': [34.6300, -1.3300],
  'Hennaya': [34.9500, -1.3700],
  'Nedroma': [35.0700, -1.7500],
  'Beni Snous': [34.6600, -1.5500],
  'Ouled Mimoun': [34.9000, -1.0300],
  'Ain Tallout': [34.8500, -1.2000],
  'Bab El Assa': [35.0800, -2.0200],
  'Honaine': [35.1800, -1.6600],
  'Ain Fezza': [34.8700, -1.2300],
  'Bensekrane': [35.0700, -1.2200],
  'Ain Youcef': [34.9600, -1.2400],
  'Sidi Djillali': [34.4000, -1.6000],
  'Bouhlou': [34.7500, -1.5000],
  'Terny': [34.7800, -1.4200],
  'Fellaoucene': [35.0000, -1.5000],
  'Sabra': [35.0300, -1.5800],
};

interface CaseData {
  commune: string | null;
  count: number;
}

interface TlemcenMapProps {
  casesByCommune: CaseData[];
  rawCases?: Array<{
    commune: string | null;
    type_cancer: string;
    sexe: string | null;
    date_diagnostic: string;
  }>;
}

function getRadius(count: number, max: number): number {
  if (max === 0) return 6;
  return 6 + (count / max) * 18;
}

export default function TlemcenMap({ casesByCommune }: TlemcenMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [34.88, -1.32],
      zoom: 9,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 16,
    }).addTo(map);

    const maxCount = Math.max(...casesByCommune.map(d => d.count), 1);

    casesByCommune.forEach(({ commune, count }) => {
      if (!commune || !COMMUNE_COORDS[commune] || count === 0) return;
      const [lat, lng] = COMMUNE_COORDS[commune];
      const radius = getRadius(count, maxCount);

      L.circleMarker([lat, lng], {
        radius,
        fillColor: 'hsl(213, 80%, 50%)',
        color: 'hsl(213, 80%, 40%)',
        weight: 1.5,
        opacity: 0.9,
        fillOpacity: 0.7,
      })
        .bindPopup(`
          <div style="font-family:system-ui;min-width:100px">
            <p style="font-weight:700;font-size:13px;margin:0 0 4px">${commune}</p>
            <p style="font-size:20px;font-weight:800;color:hsl(213,80%,45%);margin:0">${count}</p>
            <p style="font-size:11px;color:#888;margin:2px 0 0">cas enregistrés</p>
          </div>
        `)
        .addTo(map);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [casesByCommune]);

  return (
    <div ref={mapRef} className="w-full h-full rounded-lg" style={{ minHeight: '320px' }} />
  );
}
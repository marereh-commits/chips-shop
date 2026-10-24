"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import "leaflet/dist/leaflet.css";

export type PickedLocation = { address: string; lat: number; lng: number };

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (loc: PickedLocation) => void;
  accent?: string;
};

const SAVED_KEY = "saved_addresses_v1";
const KENYA_CENTER: [number, number] = [0.0236, 37.9062];

type Suggestion = { label: string; lat: number; lng: number };

export default function LocationModal({ open, onClose, onConfirm, accent = "#e4002b" }: Props) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const LRef = useRef<any>(null);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [picked, setPicked] = useState<PickedLocation | null>(null);
  const [saved, setSaved] = useState<PickedLocation[]>([]);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      setSaved(JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"));
    } catch {
      setSaved([]);
    }
  }, [open]);

  // reverse geocode via Nominatim
  async function reverse(lat: number, lng: number): Promise<string> {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
      );
      const j = await r.json();
      return j.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  }

  const setPin = useCallback(async (lat: number, lng: number, address?: string) => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([lat, lng], 17);
    markerRef.current?.setLatLng([lat, lng]);
    const addr = address ?? (await reverse(lat, lng));
    setPicked({ address: addr, lat, lng });
    setQuery(addr);
    setSuggestions([]);
  }, []);

  // init map
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapDivRef.current) return;
      LRef.current = L;

      const map = L.map(mapDivRef.current, { zoomControl: false }).setView(KENYA_CENTER, 6);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      const icon = L.divIcon({
        className: "",
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        html: `<svg width="32" height="32" viewBox="0 0 24 24" fill="${accent}" stroke="#fff" stroke-width="1"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>`,
      });
      const marker = L.marker(KENYA_CENTER, { icon, draggable: true });
      marker.on("dragend", () => {
        const p = marker.getLatLng();
        setPin(p.lat, p.lng);
      });
      map.on("click", (e: any) => {
        if (!markerRef.current._map) markerRef.current.addTo(map);
        setPin(e.latlng.lat, e.latlng.lng);
      });

      mapRef.current = map;
      markerRef.current = marker; // added to map on first pick
      setTimeout(() => map.invalidateSize(), 100);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [open, accent, setPin]);

  // make sure marker is on the map once a location is set
  useEffect(() => {
    if (picked && mapRef.current && markerRef.current && !markerRef.current._map) {
      markerRef.current.addTo(mapRef.current);
      markerRef.current.setLatLng([picked.lat, picked.lng]);
    }
  }, [picked]);

  // autocomplete via Photon (debounced)
  useEffect(() => {
    if (!open || query.trim().length < 3 || picked?.address === query) {
      setSuggestions([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        // lat/lon bias toward Kenya; bbox limits results to Kenya
        const r = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lat=-1.29&lon=36.82&bbox=33.9,-4.7,41.9,5.5`,
          { signal: ctrl.signal }
        );
        const j = await r.json();
        setSuggestions(
          (j.features ?? []).map((f: any) => {
            const p = f.properties;
            const label = [p.name, p.street, p.district, p.city ?? p.county, p.state]
              .filter(Boolean)
              .filter((v, i, a) => a.indexOf(v) === i)
              .join(", ");
            return { label, lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] };
          })
        );
      } catch {
        /* aborted or offline */
      }
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, open, picked]);

  function useCurrent() {
    setError("");
    if (!navigator.geolocation) return setError("Geolocation isn't supported on this device.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setPin(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setLocating(false);
        setError("We couldn't get your location. Allow location access or search for an address.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function confirm() {
    if (!picked) return;
    const next = [picked, ...saved.filter((s) => s.address !== picked.address)].slice(0, 3);
    localStorage.setItem(SAVED_KEY, JSON.stringify(next));
    onConfirm(picked);
  }

  if (!open) return null;

  return (
    <div className="lm-backdrop" onClick={onClose}>
      <div className="lm-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="lm-close" onClick={onClose} aria-label="Close">×</button>

        <h2 className="lm-title">You&apos;re in. Where should we deliver?</h2>

        <label className="lm-label">YOUR LOCATION</label>
        <div className="lm-search-wrap">
          <div className="lm-search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill={accent}>
              <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
            </svg>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPicked(null);
              }}
              placeholder="Search for an address..."
            />
          </div>

          {suggestions.length > 0 && (
            <ul className="lm-suggest">
              {suggestions.map((s, i) => (
                <li key={i} onClick={() => setPin(s.lat, s.lng, s.label)}>
                  {s.label}
                </li>
              ))}
            </ul>
          )}
        </div>

        <button className="lm-current" onClick={useCurrent} disabled={locating}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill={accent}>
            <path d="M12 2L4.5 20.3l.7.7L12 18l6.8 3 .7-.7z" />
          </svg>
          {locating ? "Locating..." : "Use my current location"}
        </button>

        {error && <p className="lm-error">{error}</p>}

        {saved.length === 0 ? (
          <p className="lm-muted">No saved addresses</p>
        ) : (
          <ul className="lm-saved">
            {saved.map((s) => (
              <li key={s.address} onClick={() => setPin(s.lat, s.lng, s.address)}>
                {s.address}
              </li>
            ))}
          </ul>
        )}

        <div ref={mapDivRef} className="lm-map" />

        <button className="lm-confirm" onClick={confirm} disabled={!picked}>
          Confirm location
        </button>
      </div>

      <style jsx>{`
        .lm-backdrop {
          position: fixed; inset: 0; background: rgba(0, 0, 0, 0.55);
          display: flex; align-items: center; justify-content: center;
          padding: 16px; z-index: 1000;
        }
        .lm-modal {
          position: relative; background: #fff; width: 100%; max-width: 560px;
          max-height: 95vh; overflow-y: auto; border-radius: 28px; padding: 24px;
        }
        .lm-close {
          position: absolute; top: 16px; right: 20px; background: none; border: 0;
          font-size: 28px; line-height: 1; cursor: pointer; color: #222;
        }
        .lm-title { text-align: center; font-size: 16px; font-weight: 800; margin: 8px 32px 20px; color: #1a1a1a; }
        .lm-label { display: block; font-size: 13px; font-weight: 700; color: #6b6b6b; letter-spacing: 0.03em; margin-bottom: 6px; }
        .lm-search-wrap { position: relative; }
        .lm-search {
          display: flex; align-items: center; gap: 10px; border: 1px solid #ddd;
          border-radius: 14px; padding: 0 14px; height: 48px;
        }
        .lm-search:focus-within { border-color: ${accent}; }
        .lm-search input { flex: 1; border: 0; outline: 0; font-size: 15px; background: transparent; }
        .lm-suggest {
          position: absolute; left: 0; right: 0; top: 54px; z-index: 1100; list-style: none;
          margin: 0; padding: 6px 0; background: #fff; border: 1px solid #eee;
          border-radius: 14px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
        }
        .lm-suggest li { padding: 10px 16px; font-size: 14px; cursor: pointer; }
        .lm-suggest li:hover { background: #f6f6f6; }
        .lm-current {
          display: inline-flex; align-items: center; gap: 8px; background: none; border: 0;
          color: ${accent}; font-weight: 700; font-size: 14px; padding: 10px 0 6px; cursor: pointer;
        }
        .lm-error { color: #b00020; font-size: 13px; margin: 4px 0; }
        .lm-muted { color: #6b6b6b; font-size: 14px; margin: 6px 0 12px; }
        .lm-saved { list-style: none; padding: 0; margin: 6px 0 12px; }
        .lm-saved li { padding: 8px 0; font-size: 14px; border-bottom: 1px solid #f0f0f0; cursor: pointer; }
        .lm-map { width: 100%; height: 260px; border-radius: 20px; overflow: hidden; background: #e8efe9; position: relative; z-index: 0; }
        .lm-confirm {
          width: 100%; margin-top: 16px; height: 50px; border: 0; border-radius: 999px;
          background: ${accent}; color: #fff; font-weight: 800; font-size: 15px; cursor: pointer;
        }
        .lm-confirm:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
import React, { useState, useEffect, useMemo } from "react";
import { Plus, X, Grid3x3, Clock3, Search } from "lucide-react";

// --- City data: name, country, IANA timezone, lat/lon (for weather) ---
const CITIES = [
  { name: "Vancouver", country: "Canada", tz: "America/Vancouver", lat: 49.28, lon: -123.12 },
  { name: "Seattle", country: "USA", tz: "America/Los_Angeles", lat: 47.61, lon: -122.33 },
  { name: "San Francisco", country: "USA", tz: "America/Los_Angeles", lat: 37.77, lon: -122.42 },
  { name: "Los Angeles", country: "USA", tz: "America/Los_Angeles", lat: 34.05, lon: -118.24 },
  { name: "Denver", country: "USA", tz: "America/Denver", lat: 39.74, lon: -104.99 },
  { name: "Chicago", country: "USA", tz: "America/Chicago", lat: 41.88, lon: -87.63 },
  { name: "Toronto", country: "Canada", tz: "America/Toronto", lat: 43.65, lon: -79.38 },
  { name: "New York", country: "USA", tz: "America/New_York", lat: 40.71, lon: -74.01 },
  { name: "Boston", country: "USA", tz: "America/New_York", lat: 42.36, lon: -71.06 },
  { name: "Miami", country: "USA", tz: "America/New_York", lat: 25.76, lon: -80.19 },
  { name: "Mexico City", country: "Mexico", tz: "America/Mexico_City", lat: 19.43, lon: -99.13 },
  { name: "Bogotá", country: "Colombia", tz: "America/Bogota", lat: 4.71, lon: -74.07 },
  { name: "Lima", country: "Peru", tz: "America/Lima", lat: -12.05, lon: -77.04 },
  { name: "Santiago", country: "Chile", tz: "America/Santiago", lat: -33.45, lon: -70.67 },
  { name: "São Paulo", country: "Brazil", tz: "America/Sao_Paulo", lat: -23.55, lon: -46.63 },
  { name: "Buenos Aires", country: "Argentina", tz: "America/Argentina/Buenos_Aires", lat: -34.6, lon: -58.38 },
  { name: "London", country: "UK", tz: "Europe/London", lat: 51.51, lon: -0.13 },
  { name: "Dublin", country: "Ireland", tz: "Europe/Dublin", lat: 53.35, lon: -6.26 },
  { name: "Lisbon", country: "Portugal", tz: "Europe/Lisbon", lat: 38.72, lon: -9.14 },
  { name: "Madrid", country: "Spain", tz: "Europe/Madrid", lat: 40.42, lon: -3.70 },
  { name: "Paris", country: "France", tz: "Europe/Paris", lat: 48.85, lon: 2.35 },
  { name: "Amsterdam", country: "Netherlands", tz: "Europe/Amsterdam", lat: 52.37, lon: 4.90 },
  { name: "Brussels", country: "Belgium", tz: "Europe/Brussels", lat: 50.85, lon: 4.35 },
  { name: "Zurich", country: "Switzerland", tz: "Europe/Zurich", lat: 47.37, lon: 8.54 },
  { name: "Berlin", country: "Germany", tz: "Europe/Berlin", lat: 52.52, lon: 13.40 },
  { name: "Rome", country: "Italy", tz: "Europe/Rome", lat: 41.90, lon: 12.50 },
  { name: "Vienna", country: "Austria", tz: "Europe/Vienna", lat: 48.21, lon: 16.37 },
  { name: "Prague", country: "Czechia", tz: "Europe/Prague", lat: 50.08, lon: 14.44 },
  { name: "Warsaw", country: "Poland", tz: "Europe/Warsaw", lat: 52.23, lon: 21.01 },
  { name: "Budapest", country: "Hungary", tz: "Europe/Budapest", lat: 47.50, lon: 19.04 },
  { name: "Stockholm", country: "Sweden", tz: "Europe/Stockholm", lat: 59.33, lon: 18.07 },
  { name: "Oslo", country: "Norway", tz: "Europe/Oslo", lat: 59.91, lon: 10.75 },
  { name: "Copenhagen", country: "Denmark", tz: "Europe/Copenhagen", lat: 55.68, lon: 12.57 },
  { name: "Helsinki", country: "Finland", tz: "Europe/Helsinki", lat: 60.17, lon: 24.94 },
  { name: "Athens", country: "Greece", tz: "Europe/Athens", lat: 37.98, lon: 23.73 },
  { name: "Istanbul", country: "Turkey", tz: "Europe/Istanbul", lat: 41.01, lon: 28.98 },
  { name: "Moscow", country: "Russia", tz: "Europe/Moscow", lat: 55.76, lon: 37.62 },
  { name: "Cairo", country: "Egypt", tz: "Africa/Cairo", lat: 30.04, lon: 31.24 },
  { name: "Casablanca", country: "Morocco", tz: "Africa/Casablanca", lat: 33.57, lon: -7.59 },
  { name: "Lagos", country: "Nigeria", tz: "Africa/Lagos", lat: 6.52, lon: 3.38 },
  { name: "Accra", country: "Ghana", tz: "Africa/Accra", lat: 5.60, lon: -0.19 },
  { name: "Nairobi", country: "Kenya", tz: "Africa/Nairobi", lat: -1.29, lon: 36.82 },
  { name: "Johannesburg", country: "South Africa", tz: "Africa/Johannesburg", lat: -26.20, lon: 28.04 },
  { name: "Tel Aviv", country: "Israel", tz: "Asia/Jerusalem", lat: 32.08, lon: 34.78 },
  { name: "Dubai", country: "UAE", tz: "Asia/Dubai", lat: 25.20, lon: 55.27 },
  { name: "Riyadh", country: "Saudi Arabia", tz: "Asia/Riyadh", lat: 24.71, lon: 46.68 },
  { name: "Doha", country: "Qatar", tz: "Asia/Qatar", lat: 25.29, lon: 51.53 },
  { name: "Karachi", country: "Pakistan", tz: "Asia/Karachi", lat: 24.86, lon: 67.01 },
  { name: "Mumbai", country: "India", tz: "Asia/Kolkata", lat: 19.08, lon: 72.88 },
  { name: "New Delhi", country: "India", tz: "Asia/Kolkata", lat: 28.61, lon: 77.21 },
  { name: "Kathmandu", country: "Nepal", tz: "Asia/Kathmandu", lat: 27.72, lon: 85.32 },
  { name: "Bangkok", country: "Thailand", tz: "Asia/Bangkok", lat: 13.76, lon: 100.50 },
  { name: "Jakarta", country: "Indonesia", tz: "Asia/Jakarta", lat: -6.21, lon: 106.85 },
  { name: "Kuala Lumpur", country: "Malaysia", tz: "Asia/Kuala_Lumpur", lat: 3.14, lon: 101.69 },
  { name: "Singapore", country: "Singapore", tz: "Asia/Singapore", lat: 1.35, lon: 103.82 },
  { name: "Manila", country: "Philippines", tz: "Asia/Manila", lat: 14.60, lon: 120.98 },
  { name: "Hong Kong", country: "China", tz: "Asia/Hong_Kong", lat: 22.32, lon: 114.17 },
  { name: "Shanghai", country: "China", tz: "Asia/Shanghai", lat: 31.23, lon: 121.47 },
  { name: "Beijing", country: "China", tz: "Asia/Shanghai", lat: 39.90, lon: 116.41 },
  { name: "Taipei", country: "Taiwan", tz: "Asia/Taipei", lat: 25.03, lon: 121.57 },
  { name: "Seoul", country: "South Korea", tz: "Asia/Seoul", lat: 37.57, lon: 126.98 },
  { name: "Tokyo", country: "Japan", tz: "Asia/Tokyo", lat: 35.68, lon: 139.69 },
  { name: "Perth", country: "Australia", tz: "Australia/Perth", lat: -31.95, lon: 115.86 },
  { name: "Brisbane", country: "Australia", tz: "Australia/Brisbane", lat: -27.47, lon: 153.03 },
  { name: "Sydney", country: "Australia", tz: "Australia/Sydney", lat: -33.87, lon: 151.21 },
  { name: "Melbourne", country: "Australia", tz: "Australia/Melbourne", lat: -37.81, lon: 144.96 },
  { name: "Auckland", country: "New Zealand", tz: "Pacific/Auckland", lat: -36.85, lon: 174.76 },
];

// WMO weather codes -> label / icon, per Open-Meteo docs
const WEATHER_CODES = {
  0: ["Clear", "☀️"], 1: ["Mostly clear", "🌤️"], 2: ["Partly cloudy", "⛅"], 3: ["Overcast", "☁️"],
  45: ["Fog", "🌫️"], 48: ["Fog", "🌫️"],
  51: ["Light drizzle", "🌦️"], 53: ["Drizzle", "🌦️"], 55: ["Dense drizzle", "🌦️"],
  61: ["Light rain", "🌧️"], 63: ["Rain", "🌧️"], 65: ["Heavy rain", "🌧️"],
  71: ["Light snow", "🌨️"], 73: ["Snow", "🌨️"], 75: ["Heavy snow", "🌨️"],
  80: ["Rain showers", "🌦️"], 81: ["Rain showers", "🌦️"], 82: ["Violent showers", "⛈️"],
  95: ["Thunderstorm", "⛈️"], 96: ["Thunderstorm", "⛈️"], 99: ["Thunderstorm", "⛈️"],
};

const WORK_START = 9;
const WORK_END = 17;

// Offset (in minutes) of a timezone from UTC at a given instant, via round-trip through locale strings.
function getOffsetMinutes(date, timeZone) {
  const utc = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const local = new Date(date.toLocaleString("en-US", { timeZone }));
  return Math.round((local.getTime() - utc.getTime()) / 60000);
}

function formatOffsetDiff(minutes) {
  if (minutes === 0) return "same time";
  const sign = minutes > 0 ? "+" : "-";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}h${m ? ` ${m}m` : ""}`;
}

function timeInZone(date, tz) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(date);
}

function dateInZone(date, tz) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz, weekday: "short", month: "short", day: "numeric",
  }).format(date);
}

// Build 24 hourly instants spanning "today" in the reference city, then resolve
// each city's local hour + day offset (-1/0/+1) at each of those instants.
function daysBetween(a, b) {
  const da = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const db = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.round((da - db) / 86400000);
}

function buildHourGrid(referenceTz, referenceInstant, cityList) {
  const refParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: referenceTz, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(referenceInstant);
  const y = Number(refParts.find(p => p.type === "year").value);
  const mo = Number(refParts.find(p => p.type === "month").value);
  const d = Number(refParts.find(p => p.type === "day").value);
  const refOffsetNow = getOffsetMinutes(referenceInstant, referenceTz);
  const refMidnightUTC = Date.UTC(y, mo - 1, d, 0, 0, 0) - refOffsetNow * 60000;
  const refDayAnchor = new Date(Date.UTC(y, mo - 1, d));

  const hours = Array.from({ length: 24 }, (_, h) => new Date(refMidnightUTC + h * 3600000));

  return cityList.map(city => {
    const cells = hours.map(instant => {
      const offset = getOffsetMinutes(instant, city.tz);
      const local = new Date(instant.getTime() + offset * 60000);
      const localHour = local.getUTCHours();
      const dayShift = daysBetween(local, refDayAnchor);
      return { instant, localHour, dayShift };
    });
    return { city, cells };
  });
}

export default function TimeZoneComparer() {
  const [cities, setCities] = useState([CITIES.find(c => c.name === "Vancouver")]);
  const [now, setNow] = useState(new Date());
  const [mode, setMode] = useState("clocks");
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (cities.length !== 1) { setWeather(null); return; }
    const city = cities[0];
    let cancelled = false;
    setWeather({ loading: true });
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current_weather=true`)
      .then(r => r.json())
      .then(data => { if (!cancelled) setWeather({ loading: false, data: data.current_weather }); })
      .catch(() => { if (!cancelled) setWeather({ loading: false, error: true }); });
    return () => { cancelled = true; };
  }, [cities]);

  const reference = cities[0];

  const filtered = useMemo(() => {
    if (!query.trim()) return CITIES.filter(c => !cities.some(sel => sel.name === c.name)).slice(0, 8);
    const q = query.toLowerCase();
    return CITIES.filter(c =>
      !cities.some(sel => sel.name === c.name) &&
      (c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [query, cities]);

  const addCity = (city) => {
    if (cities.length >= 3) return;
    setCities([...cities, city]);
    setAdding(false);
    setQuery("");
  };

  const removeCity = (name) => setCities(cities.filter(c => c.name !== name));

  const grid = useMemo(() => {
    if (mode !== "grid" || !reference) return [];
    return buildHourGrid(reference.tz, now, cities);
  }, [mode, reference, cities, now]);

  return (
    <div className="tzc-root">
      <style>{`
        .tzc-root {
          --ink: #1c2024;
          --muted: #6b7280;
          --line: #e4e1da;
          --surface: #ffffff;
          --bg: #f6f4ef;
          --work: #1f6f5c;
          --work-bg: #e3efec;
          --off-bg: #eeece6;
          --ref: #2b4c7e;
          --ref-bg: #eaeff6;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
          background: var(--bg);
          color: var(--ink);
          min-height: 100%;
          padding: 20px 16px 40px;
          box-sizing: border-box;
        }
        .tzc-mono { font-family: ui-monospace, "SF Mono", "Roboto Mono", Menlo, monospace; }
        .tzc-header {
          display: flex; align-items: center; justify-content: space-between;
          max-width: 900px; margin: 0 auto 20px; gap: 12px; flex-wrap: wrap;
        }
        .tzc-title { font-size: 18px; font-weight: 600; letter-spacing: -0.01em; }
        .tzc-toggle {
          display: flex; align-items: center; gap: 6px; background: var(--surface);
          border: 1px solid var(--line); border-radius: 8px; padding: 6px 12px;
          font-size: 13px; cursor: pointer; color: var(--ink);
        }
        .tzc-toggle:disabled { opacity: 0.4; cursor: not-allowed; }
        .tzc-cities {
          max-width: 900px; margin: 0 auto; display: flex; gap: 12px; flex-wrap: wrap;
        }
        .tzc-card {
          background: var(--surface); border: 1px solid var(--line); border-radius: 12px;
          padding: 16px; flex: 1 1 220px; min-width: 220px; position: relative;
        }
        .tzc-card.is-ref { border-color: var(--ref); }
        .tzc-card-top { display: flex; justify-content: space-between; align-items: flex-start; }
        .tzc-city-name { font-size: 15px; font-weight: 600; }
        .tzc-city-sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
        .tzc-remove {
          background: none; border: none; color: var(--muted); cursor: pointer; padding: 2px;
          border-radius: 4px; display: flex;
        }
        .tzc-remove:hover { background: var(--off-bg); color: var(--ink); }
        .tzc-clock { font-size: 34px; font-weight: 600; margin-top: 14px; letter-spacing: -0.01em; }
        .tzc-date { font-size: 13px; color: var(--muted); margin-top: 2px; }
        .tzc-refpill {
          display: inline-block; font-size: 11px; color: var(--ref); background: var(--ref-bg);
          border-radius: 999px; padding: 2px 8px; margin-top: 10px; font-weight: 500;
        }
        .tzc-diffpill {
          display: inline-block; font-size: 12px; color: var(--work); background: var(--work-bg);
          border-radius: 999px; padding: 3px 9px; margin-top: 10px; font-weight: 500;
        }
        .tzc-addcard {
          border: 1px dashed var(--line); border-radius: 12px; flex: 1 1 220px; min-width: 220px;
          display: flex; align-items: center; justify-content: center; min-height: 120px;
          background: transparent; cursor: pointer; color: var(--muted); gap: 6px; font-size: 14px;
        }
        .tzc-addcard:hover { border-color: var(--ref); color: var(--ref); }
        .tzc-searchwrap {
          max-width: 900px; margin: 12px auto 0; background: var(--surface); border: 1px solid var(--line);
          border-radius: 12px; padding: 12px; flex-basis: 100%;
        }
        .tzc-searchinput {
          display: flex; align-items: center; gap: 8px; border: 1px solid var(--line); border-radius: 8px;
          padding: 8px 10px;
        }
        .tzc-searchinput input {
          border: none; outline: none; font-size: 14px; width: 100%; background: transparent; color: var(--ink);
        }
        .tzc-results { margin-top: 8px; max-height: 220px; overflow-y: auto; }
        .tzc-result {
          padding: 8px 10px; border-radius: 6px; cursor: pointer; font-size: 14px;
          display: flex; justify-content: space-between;
        }
        .tzc-result:hover { background: var(--off-bg); }
        .tzc-result span { color: var(--muted); font-size: 12px; }
        .tzc-weather {
          margin-top: 16px; border-top: 1px solid var(--line); padding-top: 12px;
          display: flex; align-items: center; gap: 10px; max-width: 900px; margin-left: auto; margin-right: auto;
        }
        .tzc-weather-icon { font-size: 28px; }
        .tzc-weather-temp { font-size: 20px; font-weight: 600; }
        .tzc-weather-label { font-size: 13px; color: var(--muted); }
        .tzc-gridwrap { max-width: 900px; margin: 0 auto; background: var(--surface); border: 1px solid var(--line);
          border-radius: 12px; padding: 16px; overflow-x: auto; }
        .tzc-gridnote { font-size: 12px; color: var(--muted); margin-bottom: 14px; }
        .tzc-gridrow { display: flex; align-items: center; margin-bottom: 10px; gap: 10px; }
        .tzc-gridlabel { width: 96px; flex-shrink: 0; font-size: 13px; font-weight: 500; }
        .tzc-gridlabel.is-ref { color: var(--ref); }
        .tzc-cells { display: flex; gap: 2px; flex: 1; min-width: 560px; }
        .tzc-cell {
          flex: 1; text-align: center; font-size: 10px; padding: 6px 0; border-radius: 4px;
          background: var(--off-bg); color: var(--muted); position: relative;
        }
        .tzc-cell.work { background: var(--work-bg); color: var(--work); font-weight: 600; }
        .tzc-cell.now { box-shadow: 0 0 0 2px var(--ref) inset; }
        .tzc-cell sup { font-size: 8px; }
        .tzc-legend { display: flex; gap: 16px; font-size: 12px; color: var(--muted); margin-top: 14px; }
        .tzc-legend-dot { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; }
      `}</style>

      <div className="tzc-header">
        <div className="tzc-title">Time zones</div>
        <button
          className="tzc-toggle"
          disabled={cities.length < 2}
          onClick={() => setMode(mode === "clocks" ? "grid" : "clocks")}
        >
          {mode === "clocks" ? <Grid3x3 size={14} /> : <Clock3 size={14} />}
          {mode === "clocks" ? "Compare all hours" : "Back to clocks"}
        </button>
      </div>

      {mode === "clocks" && (
        <>
          <div className="tzc-cities">
            {cities.map((city, i) => {
              const diff = i === 0 ? null : getOffsetMinutes(now, city.tz) - getOffsetMinutes(now, reference.tz);
              return (
                <div key={city.name} className={`tzc-card${i === 0 ? " is-ref" : ""}`}>
                  <div className="tzc-card-top">
                    <div>
                      <div className="tzc-city-name">{city.name}</div>
                      <div className="tzc-city-sub">{city.country}</div>
                    </div>
                    {cities.length > 1 && (
                      <button className="tzc-remove" onClick={() => removeCity(city.name)}>
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <div className="tzc-clock tzc-mono">{timeInZone(now, city.tz)}</div>
                  <div className="tzc-date">{dateInZone(now, city.tz)}</div>
                  {i === 0 && cities.length > 1 && <div className="tzc-refpill">Reference</div>}
                  {i > 0 && <div className="tzc-diffpill">{formatOffsetDiff(diff)} vs {reference.name}</div>}
                </div>
              );
            })}
            {cities.length < 3 && (
              <button className="tzc-addcard" onClick={() => setAdding(true)}>
                <Plus size={16} /> Add city
              </button>
            )}
          </div>

          {adding && (
            <div className="tzc-searchwrap">
              <div className="tzc-searchinput">
                <Search size={14} color="var(--muted)" />
                <input
                  autoFocus
                  placeholder="Search a city..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
                <button className="tzc-remove" onClick={() => { setAdding(false); setQuery(""); }}>
                  <X size={16} />
                </button>
              </div>
              <div className="tzc-results">
                {filtered.map(c => (
                  <div key={c.name} className="tzc-result" onClick={() => addCity(c)}>
                    {c.name} <span>{c.country}</span>
                  </div>
                ))}
                {filtered.length === 0 && <div className="tzc-result" style={{ color: "var(--muted)" }}>No matches</div>}
              </div>
            </div>
          )}

          {cities.length === 1 && (
            <div className="tzc-weather">
              {weather?.loading && <div className="tzc-weather-label">Loading weather…</div>}
              {weather?.error && (
                <div className="tzc-weather-label">
                  Weather unavailable in this preview (network access is restricted here) — it will work once this is deployed to real hosting.
                </div>
              )}
              {weather?.data && (
                <>
                  <div className="tzc-weather-icon">{(WEATHER_CODES[weather.data.weathercode] || ["", "🌡️"])[1]}</div>
                  <div>
                    <div className="tzc-weather-temp">{Math.round(weather.data.temperature)}°C</div>
                    <div className="tzc-weather-label">
                      {(WEATHER_CODES[weather.data.weathercode] || ["Weather", ""])[0]} · wind {Math.round(weather.data.windspeed)} km/h
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {mode === "grid" && reference && (
        <div className="tzc-gridwrap">
          <div className="tzc-gridnote">
            Based on today ({dateInZone(now, reference.tz)}) in {reference.name}. Highlighted cells are that city's working hours ({WORK_START}:00–{WORK_END}:00 local).
          </div>
          {grid.map(({ city, cells }, i) => (
            <div className="tzc-gridrow" key={city.name}>
              <div className={`tzc-gridlabel${i === 0 ? " is-ref" : ""}`}>{city.name}</div>
              <div className="tzc-cells">
                {cells.map((cell, idx) => {
                  const isWork = cell.localHour >= WORK_START && cell.localHour < WORK_END;
                  const isNow = Math.abs(cell.instant.getTime() - now.getTime()) < 30 * 60000;
                  return (
                    <div key={idx} className={`tzc-cell${isWork ? " work" : ""}${isNow ? " now" : ""}`}>
                      {String(cell.localHour).padStart(2, "0")}
                      {cell.dayShift !== 0 && <sup>{cell.dayShift > 0 ? "+1" : "-1"}</sup>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="tzc-legend">
            <span><i className="tzc-legend-dot" style={{ background: "var(--work-bg)", boxShadow: "inset 0 0 0 1px var(--work)" }} /> working hours</span>
            <span><i className="tzc-legend-dot" style={{ background: "var(--off-bg)" }} /> outside working hours</span>
            <span><i className="tzc-legend-dot" style={{ background: "var(--surface)", boxShadow: "inset 0 0 0 2px var(--ref)" }} /> current hour</span>
          </div>
        </div>
      )}
    </div>
  );
}

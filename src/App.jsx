import React, { useState, useEffect, useMemo } from "react";
import { Plus, X, Search, Pencil, ArrowLeftRight, GripVertical, ChevronDown, ChevronUp } from "lucide-react";

// Small non-US-first default suggestion pool, shown before the user types anything.
// Any city in the world can still be found via the live search (Open-Meteo geocoding).
const POPULAR_CITIES = [
  { name: "Vancouver", country: "Canada", tz: "America/Vancouver", lat: 49.28, lon: -123.12 },
  { name: "London", country: "United Kingdom", tz: "Europe/London", lat: 51.51, lon: -0.13 },
  { name: "Berlin", country: "Germany", tz: "Europe/Berlin", lat: 52.52, lon: 13.40 },
  { name: "Toronto", country: "Canada", tz: "America/Toronto", lat: 43.65, lon: -79.38 },
  { name: "Mumbai", country: "India", tz: "Asia/Kolkata", lat: 19.08, lon: 72.88 },
  { name: "Singapore", country: "Singapore", tz: "Asia/Singapore", lat: 1.35, lon: 103.82 },
  { name: "Tokyo", country: "Japan", tz: "Asia/Tokyo", lat: 35.68, lon: 139.69 },
  { name: "Sydney", country: "Australia", tz: "Australia/Sydney", lat: -33.87, lon: 151.21 },
];

const WEATHER_CODES = {
  0: ["Clear", "☀️"], 1: ["Mostly clear", "🌤️"], 2: ["Partly cloudy", "⛅"], 3: ["Overcast", "☁️"],
  45: ["Fog", "🌫️"], 48: ["Fog", "🌫️"],
  51: ["Light drizzle", "🌦️"], 53: ["Drizzle", "🌦️"], 55: ["Dense drizzle", "🌦️"],
  61: ["Light rain", "🌧️"], 63: ["Rain", "🌧️"], 65: ["Heavy rain", "🌧️"],
  71: ["Light snow", "🌨️"], 73: ["Snow", "🌨️"], 75: ["Heavy snow", "🌨️"],
  80: ["Rain showers", "🌦️"], 81: ["Rain showers", "🌦️"], 82: ["Violent showers", "⛈️"],
  95: ["Thunderstorm", "⛈️"], 96: ["Thunderstorm", "⛈️"], 99: ["Thunderstorm", "⛈️"],
};

// --- timezone math -----------------------------------------------------

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

function localHour24(date, tz) {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hour12: false }).format(date)) % 24;
}

// DST is in effect when the current offset is greater than the zone's standard
// (non-DST) offset. The standard offset is the smaller of the Jan-1 and Jul-1
// offsets, which works for both hemispheres since DST always moves clocks forward.
function isObservingDST(instant, tz) {
  const year = instant.getUTCFullYear();
  const jan = getOffsetMinutes(new Date(Date.UTC(year, 0, 1, 12)), tz);
  const jul = getOffsetMinutes(new Date(Date.UTC(year, 6, 1, 12)), tz);
  const standard = Math.min(jan, jul);
  return getOffsetMinutes(instant, tz) > standard;
}

function formatCityCell(instant, tz) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, weekday: "short", hour: "numeric", minute: "2-digit", hour12: true,
  }).formatToParts(instant);
  const weekday = parts.find(p => p.type === "weekday").value;
  const hour = parts.find(p => p.type === "hour").value;
  const minute = parts.find(p => p.type === "minute").value;
  const dayPeriod = (parts.find(p => p.type === "dayPeriod")?.value || "").toLowerCase();
  const hour24 = localHour24(instant, tz);
  let label;
  if (hour24 === 0 && minute === "00") label = `${weekday} 12:00 midnight`;
  else if (hour24 === 12 && minute === "00") label = `${weekday} 12:00 noon`;
  else label = `${weekday} ${hour}:${minute} ${dayPeriod}`;
  return { label, dst: isObservingDST(instant, tz), hour24 };
}

function formatUTCCell(instant) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
  }).format(instant);
}

// start/end let each city use its own "work" window. Supports overnight ranges
// (e.g. start 22, end 6) by wrapping, in case someone sets an odd availability window.
function inWindow(hour24, start, end) {
  if (start === end) return false;
  if (start < end) return hour24 >= start && hour24 < end;
  return hour24 >= start || hour24 < end;
}

function categorize(hour24, workStart = 9, workEnd = 17) {
  if (inWindow(hour24, workStart, workEnd)) return "work";
  if ((hour24 >= 7 && hour24 < 9) || (hour24 >= 17 && hour24 < 22)) return "awake";
  return "sleep";
}

function formatHourLabel(h) {
  if (h === 24) return "12:00 midnight";
  const period = h < 12 ? "am" : "pm";
  let display = h % 12;
  if (display === 0) display = 12;
  return `${display}:00 ${period}`;
}

export default function TimeZoneComparer() {
  const [cities, setCities] = useState([POPULAR_CITIES.find(c => c.name === "Vancouver")]);
  const [now, setNow] = useState(new Date());
  const [showClocks, setShowClocks] = useState(true);
  const [showCompare, setShowCompare] = useState(true);
  const [editingSlot, setEditingSlot] = useState(null); // index being replaced, or cities.length to append
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [weather, setWeather] = useState({});
  const [availability, setAvailability] = useState({}); // { [cityName]: { start, end } }
  const getAvail = (city) => availability[city.name] || { start: 9, end: 17 };
  const setAvail = (name, patch) => setAvailability(prev => ({ ...prev, [name]: { ...(prev[name] || { start: 9, end: 17 }), ...patch } }));
  const resetAvail = (name) => setAvailability(prev => { const next = { ...prev }; delete next[name]; return next; });
  const [recentCities, setRecentCities] = useState([]); // session-only "previously used" list
  const [rangeDays, setRangeDays] = useState(1);
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Weather for every selected city (not just when there's one).
  useEffect(() => {
    let cancelled = false;
    cities.forEach(city => {
      setWeather(w => ({ ...w, [city.name]: { loading: true } }));
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current_weather=true`)
        .then(r => r.json())
        .then(data => { if (!cancelled) setWeather(w => ({ ...w, [city.name]: { loading: false, data: data.current_weather } })); })
        .catch(() => { if (!cancelled) setWeather(w => ({ ...w, [city.name]: { loading: false, error: true } })); });
    });
    return () => { cancelled = true; };
  }, [cities]);

  // Live city search (any city worldwide), debounced.
  useEffect(() => {
    if (editingSlot === null) return;
    if (query.trim().length < 2) { setSearchResults(null); setSearchError(false); return; }
    setSearchLoading(true);
    const t = setTimeout(() => {
      fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=8&language=en&format=json`)
        .then(r => r.json())
        .then(data => {
          const results = (data.results || []).map(r => ({
            name: r.name, country: r.country || "", tz: r.timezone, lat: r.latitude, lon: r.longitude, region: r.admin1,
          }));
          setSearchResults(results); setSearchLoading(false); setSearchError(false);
        })
        .catch(() => { setSearchResults(null); setSearchLoading(false); setSearchError(true); });
    }, 350);
    return () => clearTimeout(t);
  }, [query, editingSlot]);

  const reference = cities[0];

  const suggestions = useMemo(() => {
    const exclude = (c) => !cities.some(sel => sel.name === c.name && sel.tz === c.tz);
    if (query.trim().length < 2) {
      const recent = recentCities.filter(exclude);
      const popular = POPULAR_CITIES.filter(exclude).filter(c => !recent.some(r => r.name === c.name));
      return [...recent, ...popular].slice(0, 10);
    }
    return (searchResults || []).filter(exclude);
  }, [query, searchResults, cities, recentCities]);

  const openAdd = () => { setEditingSlot(cities.length); setQuery(""); setSearchResults(null); };
  const openEdit = (i) => { setEditingSlot(i); setQuery(""); setSearchResults(null); };
  const closeSearch = () => { setEditingSlot(null); setQuery(""); setSearchResults(null); };

  const selectCity = (city) => {
    setCities(prev => {
      const next = [...prev];
      if (editingSlot < next.length) next[editingSlot] = city;
      else next.push(city);
      return next;
    });
    setRecentCities(prev => [city, ...prev.filter(c => !(c.name === city.name && c.tz === city.tz))].slice(0, 10));
    closeSearch();
  };

  const removeCity = (name) => setCities(cities.filter(c => c.name !== name));

  const swapCities = (i, j) => setCities(prev => {
    const next = [...prev];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  const reorderCities = (from, to) => setCities(prev => {
    if (from === to) return prev;
    const next = [...prev];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  });

  const onCardDragStart = (i) => (e) => { setDragIndex(i); e.dataTransfer.effectAllowed = "move"; };
  const onCardDragOver = (i) => (e) => { e.preventDefault(); if (dragOverIndex !== i) setDragOverIndex(i); };
  const onCardDrop = (i) => (e) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== i) reorderCities(dragIndex, i);
    setDragIndex(null); setDragOverIndex(null);
  };
  const onCardDragEnd = () => { setDragIndex(null); setDragOverIndex(null); };

  // Vertical, UTC-anchored comparison table: starts at the current hour, spans
  // either 24 hours or 7 days depending on the range toggle.
  const gridRows = useMemo(() => {
    if (!showCompare || cities.length < 2) return [];
    const startUTC = new Date(Math.floor(now.getTime() / 3600000) * 3600000);
    const hourCount = rangeDays * 24;
    const hours = Array.from({ length: hourCount }, (_, i) => new Date(startUTC.getTime() + i * 3600000));
    return hours.map(instant => {
      const cells = cities.map((city, i) => {
        const { label, dst, hour24 } = formatCityCell(instant, city.tz);
        const category = categorize(hour24, getAvail(city).start, getAvail(city).end);
        return { city, label, dst, category };
      });
      const workingCount = cells.filter(c => c.category === "work").length;
      cells.forEach(c => { if (c.category === "work" && workingCount >= 2) c.overlap = true; });
      const allWorking = cells.every(c => c.category === "work");
      return { instant, cells, allWorking };
    });
  }, [showCompare, cities, now, availability, rangeDays]);

  const hasMutualSlot = cities.length < 2 || gridRows.some(r => r.allWorking);

  const overlapPairs = useMemo(() => {
    if (cities.length < 2) return [];
    const pairs = [];
    for (let i = 0; i < cities.length; i++) {
      for (let j = i + 1; j < cities.length; j++) {
        const found = gridRows.some(row => row.cells[i].category === "work" && row.cells[j].category === "work");
        pairs.push({ i, j, found });
      }
    }
    return pairs;
  }, [gridRows, cities]);

  return (
    <div className="tzc-root">
      <style>{`
        .tzc-root {
          --ink: #1c2024; --muted: #6b7280; --line: #e4e1da; --surface: #ffffff; --bg: #f6f4ef;
          --work: #1f6f5c; --work-bg: #d8ede6; --work-bright-bg: #7bd9b8; --work-bright-fg: #0c3d31;
          --awake: #8a6d1e; --awake-bg: #f3ecd4;
          --sleep: #3b4a63; --sleep-bg: #e6e9ef;
          --ref: #2b4c7e; --ref-bg: #eaeff6;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
          background: var(--bg); color: var(--ink); min-height: 100%; padding: 20px 16px 40px; box-sizing: border-box;
        }
        .tzc-mono { font-family: ui-monospace, "SF Mono", "Roboto Mono", Menlo, monospace; }
        .tzc-title { font-size: 18px; font-weight: 600; letter-spacing: -0.01em; }
        .tzc-sectionwrap { max-width: 900px; margin: 0 auto 24px; }
        .tzc-sectionhead { width: 100%; display: flex; align-items: center; justify-content: space-between; background: none; border: none; padding: 0 0 14px; cursor: pointer; color: var(--ink); }
        .tzc-cities { max-width: 900px; margin: 0 auto; display: flex; gap: 12px; flex-wrap: wrap; }
        .tzc-card { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 16px; flex: 1 1 220px; min-width: 220px; position: relative; cursor: grab; }
        .tzc-card.is-ref { border-color: var(--ref); }
        .tzc-card.dragging { opacity: 0.4; }
        .tzc-card.drag-over { border-color: var(--ref); border-style: dashed; }
        .tzc-drag-handle { color: var(--muted); }
        .tzc-card-top { display: flex; justify-content: space-between; align-items: flex-start; }
        .tzc-city-name { font-size: 15px; font-weight: 600; }
        .tzc-city-sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
        .tzc-icon-btn { background: none; border: none; color: var(--muted); cursor: pointer; padding: 3px; border-radius: 4px; display: flex; }
        .tzc-icon-btn:hover { background: var(--off-bg, #eeece6); color: var(--ink); }
        .tzc-card-actions { display: flex; gap: 2px; }
        .tzc-clock { font-size: 34px; font-weight: 600; margin-top: 14px; letter-spacing: -0.01em; }
        .tzc-date { font-size: 13px; color: var(--muted); margin-top: 2px; }
        .tzc-refpill { display: inline-block; font-size: 11px; color: var(--ref); background: var(--ref-bg); border-radius: 999px; padding: 2px 8px; margin-top: 10px; font-weight: 500; }
        .tzc-diffpill { display: inline-block; font-size: 12px; color: var(--work); background: var(--work-bg); border-radius: 999px; padding: 3px 9px; margin-top: 10px; font-weight: 500; }
        .tzc-weatherline { display: flex; align-items: center; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--line); font-size: 13px; color: var(--muted); }
        .tzc-weatherline .icon { font-size: 18px; }
        .tzc-weatherline .temp { font-weight: 600; color: var(--ink); }
        .tzc-weatherrow { max-width: 900px; margin: 16px auto 0; display: flex; gap: 12px; flex-wrap: wrap; }
        .tzc-weathercard { flex: 1 1 220px; min-width: 220px; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 18px; display: flex; align-items: center; gap: 16px; }
        .tzc-weathercard .icon { font-size: 44px; line-height: 1; }
        .tzc-weathercard .temp { font-size: 30px; font-weight: 700; }
        .tzc-weathercard .name { font-size: 13px; color: var(--muted); margin-bottom: 2px; }
        .tzc-weathercard .desc { font-size: 13px; color: var(--muted); }
        .tzc-weatherplaceholder { flex: 1 1 220px; min-width: 220px; }
        .tzc-addcard { border: 1px dashed var(--line); border-radius: 12px; flex: 1 1 220px; min-width: 220px; display: flex; align-items: center; justify-content: center; min-height: 120px; background: transparent; cursor: pointer; color: var(--muted); gap: 6px; font-size: 14px; }
        .tzc-addcard:hover { border-color: var(--ref); color: var(--ref); }
        .tzc-searchwrap { max-width: 900px; margin: 12px auto 0; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 12px; flex-basis: 100%; }
        .tzc-searchinput { display: flex; align-items: center; gap: 8px; border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; }
        .tzc-searchinput input { border: none; outline: none; font-size: 14px; width: 100%; background: transparent; color: var(--ink); }
        .tzc-results { margin-top: 8px; max-height: 240px; overflow-y: auto; }
        .tzc-result { padding: 8px 10px; border-radius: 6px; cursor: pointer; font-size: 14px; display: flex; justify-content: space-between; }
        .tzc-result:hover { background: #eeece6; }
        .tzc-result span { color: var(--muted); font-size: 12px; }
        .tzc-hint { font-size: 12px; color: var(--muted); margin-top: 8px; }
        .tzc-gridwrap { max-width: 900px; margin: 0 auto; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 16px; overflow-x: auto; }
        .tzc-gridnote { font-size: 12px; color: var(--muted); margin-bottom: 10px; }
        .tzc-dstnote { font-size: 12px; color: var(--muted); margin-top: 14px; }
        .tzc-warning { background: #fbe4e2; color: #a3231b; border: 1px solid #f0b3ad; border-radius: 8px; padding: 10px 14px; font-size: 13px; margin-bottom: 14px; font-weight: 500; }
        .tzc-warning-list { margin: 4px 0 0; padding-left: 18px; font-weight: 400; }
        .tzc-availcity { display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 12px; flex-wrap: wrap; }
        .tzc-availcity select { border: 1px solid var(--line); border-radius: 6px; padding: 3px 6px; font-size: 12px; background: var(--surface); color: var(--ink); }
        tr.avail-row td { background: var(--ref-bg); border-bottom: 2px solid var(--ref); padding: 8px 6px; }
        .tzc-resetlink { background: none; border: none; color: var(--ref); font-size: 12px; cursor: pointer; padding: 0; text-decoration: underline; }
        .tzc-gridflex { display: flex; gap: 10px; align-items: flex-start; }
        .tzc-tablescroll { flex: 1; overflow: auto; max-height: 480px; }
        .tzc-rangebar { display: flex; flex-direction: column; gap: 6px; flex-shrink: 0; }
        .tzc-rangebar button { writing-mode: horizontal-tb; border: 1px solid var(--line); background: var(--surface); border-radius: 6px; padding: 8px 6px; font-size: 11px; cursor: pointer; color: var(--muted); width: 46px; }
        .tzc-rangebar button.active { border-color: var(--ref); color: var(--ref); background: var(--ref-bg); font-weight: 600; }
        table.tzc-table { border-collapse: collapse; width: 100%; font-size: 13px; min-width: 480px; }
        table.tzc-table th { text-align: center; font-size: 12px; color: var(--muted); font-weight: 600; padding: 6px 10px; border-bottom: 1px solid var(--line); position: sticky; top: 0; background: var(--surface); }
        table.tzc-table th .th-inner { display: flex; align-items: center; justify-content: center; gap: 4px; }
        table.tzc-table td { padding: 6px 10px; border-bottom: 1px solid var(--line); white-space: nowrap; text-align: center; }
        table.tzc-table td.utc { color: var(--muted); font-family: ui-monospace, "SF Mono", "Roboto Mono", Menlo, monospace; font-size: 12px; text-align: left; }
        table.tzc-table tr.now td { font-weight: 700; }
        .tzc-cell-tag { display: inline-block; padding: 3px 8px; border-radius: 6px; }
        .tzc-cell-tag.work { background: var(--work-bg); color: var(--work); }
        .tzc-cell-tag.work-overlap { background: var(--work-bright-bg); color: var(--work-bright-fg); font-weight: 700; }
        .tzc-cell-tag.awake { background: var(--awake-bg); color: var(--awake); }
        .tzc-cell-tag.sleep { background: var(--sleep-bg); color: var(--sleep); }
        .tzc-legend { display: flex; gap: 16px; font-size: 12px; color: var(--muted); margin-bottom: 14px; flex-wrap: wrap; }
        .tzc-legend-dot { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; }
      `}</style>

      <div className="tzc-sectionwrap">
        <button className="tzc-sectionhead" onClick={() => setShowClocks(v => !v)}>
          <span className="tzc-title">Time zones</span>
          {showClocks ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {showClocks && (
          <>
          <div className="tzc-cities">
            {cities.map((city, i) => {
              const diff = i === 0 ? null : getOffsetMinutes(now, city.tz) - getOffsetMinutes(now, reference.tz);
              return (
                <div
                  key={city.name}
                  className={`tzc-card${i === 0 ? " is-ref" : ""}${dragIndex === i ? " dragging" : ""}${dragOverIndex === i && dragIndex !== i ? " drag-over" : ""}`}
                  draggable
                  onDragStart={onCardDragStart(i)}
                  onDragOver={onCardDragOver(i)}
                  onDrop={onCardDrop(i)}
                  onDragEnd={onCardDragEnd}
                  title="Drag to reorder"
                >
                  <div className="tzc-card-top">
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <GripVertical size={16} className="tzc-drag-handle" style={{ marginTop: 2 }} />
                      <div>
                        <div className="tzc-city-name">{city.name}</div>
                        <div className="tzc-city-sub">{city.country}</div>
                      </div>
                    </div>
                    <div className="tzc-card-actions">
                      <button className="tzc-icon-btn" title="Change city" onClick={() => openEdit(i)}><Pencil size={15} /></button>
                      {cities.length > 1 && <button className="tzc-icon-btn" title="Remove" onClick={() => removeCity(city.name)}><X size={16} /></button>}
                    </div>
                  </div>
                  <div className="tzc-clock tzc-mono">{timeInZone(now, city.tz)}</div>
                  <div className="tzc-date">{dateInZone(now, city.tz)}</div>
                  {i === 0 && cities.length > 1 && <div className="tzc-refpill">Reference</div>}
                  {i > 0 && <div className="tzc-diffpill">{formatOffsetDiff(diff)} vs {reference.name}</div>}
                </div>
              );
            })}
            {cities.length < 3 && (
              <button className="tzc-addcard" onClick={openAdd}><Plus size={16} /> Add city</button>
            )}
          </div>

          {editingSlot !== null && (
            <div className="tzc-searchwrap">
              <div className="tzc-searchinput">
                <Search size={14} color="var(--muted)" />
                <input autoFocus placeholder="Search any city (e.g. Lorient, Toulouse...)" value={query} onChange={e => setQuery(e.target.value)} />
                <button className="tzc-icon-btn" onClick={closeSearch}><X size={16} /></button>
              </div>
              <div className="tzc-results">
                {query.trim().length >= 2 && searchLoading && <div className="tzc-result" style={{ color: "var(--muted)" }}>Searching…</div>}
                {query.trim().length >= 2 && searchError && (
                  <div className="tzc-result" style={{ color: "var(--muted)" }}>
                    City search is blocked in this preview (sandbox network restriction) — it will work once this is deployed.
                  </div>
                )}
                {!searchLoading && !searchError && suggestions.map(c => (
                  <div key={`${c.name}-${c.tz}`} className="tzc-result" onClick={() => selectCity(c)}>
                    {c.name}{c.region ? `, ${c.region}` : ""} <span>{c.country}</span>
                  </div>
                ))}
                {!searchLoading && !searchError && query.trim().length >= 2 && suggestions.length === 0 && (
                  <div className="tzc-result" style={{ color: "var(--muted)" }}>No matches</div>
                )}
              </div>
              {query.trim().length < 2 && <div className="tzc-hint">Type at least 2 letters to search any city worldwide. Previously used cities are listed first.</div>}
            </div>
          )}

          <div className="tzc-weatherrow">
            {cities.map(city => {
              const w = weather[city.name];
              return (
                <div key={city.name} className="tzc-weathercard">
                  {w?.loading && <span style={{ color: "var(--muted)", fontSize: 13 }}>Loading weather…</span>}
                  {w?.error && <span style={{ color: "var(--muted)", fontSize: 13 }}>Weather unavailable here (blocked in this preview) — works once deployed.</span>}
                  {w?.data && (
                    <>
                      <span className="icon">{(WEATHER_CODES[w.data.weathercode] || ["", "🌡️"])[1]}</span>
                      <div>
                        <div className="name">{city.name}</div>
                        <div className="temp">{Math.round(w.data.temperature)}°C</div>
                        <div className="desc">{(WEATHER_CODES[w.data.weathercode] || ["", ""])[0]} · wind {Math.round(w.data.windspeed)} km/h</div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
            {Array.from({ length: 3 - cities.length }).map((_, i) => (
              <div key={`ph-${i}`} className="tzc-weatherplaceholder" />
            ))}
          </div>

          </>
        )}
      </div>

      <div className="tzc-sectionwrap">
        <button className="tzc-sectionhead" onClick={() => setShowCompare(v => !v)}>
          <span className="tzc-title">Compare all hours</span>
          {showCompare ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {showCompare && cities.length < 2 && (
          <div className="tzc-hint">Add at least one more city above to compare hours.</div>
        )}

        {showCompare && cities.length >= 2 && (
        <div className="tzc-gridwrap">
          {!hasMutualSlot && (
            <div className="tzc-warning">
              {cities.length === 2 && (
                <>No overlapping hours found. Try widening availability or extending the range on the right.</>
              )}
              {cities.length === 3 && (() => {
                const goodPairs = overlapPairs.filter(p => p.found);
                if (goodPairs.length === 0) {
                  return <>No availability between the {cities.map(c => c.name).join(", ")}.</>;
                }
                return (
                  <>
                    Availability only found between:
                    <ul className="tzc-warning-list">
                      {goodPairs.map((p, idx) => (
                        <li key={idx}>{cities[p.i].name} and {cities[p.j].name}</li>
                      ))}
                    </ul>
                  </>
                );
              })()}
            </div>
          )}

          <div className="tzc-gridflex">
            <div className="tzc-tablescroll">
              <table className="tzc-table">
                <thead>
                  <tr>
                    <th>UTC time</th>
                    {cities.map((c, i) => (
                      <th key={c.name}>
                        <div className="th-inner">
                          {i > 0 && (
                            <button className="tzc-icon-btn" title={`Swap with ${cities[i - 1].name}`} onClick={() => swapCities(i - 1, i)}>
                              <ArrowLeftRight size={13} />
                            </button>
                          )}
                          {c.name}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="avail-row">
                    <td className="utc">Availability</td>
                    {cities.map(city => {
                      const a = getAvail(city);
                      return (
                        <td key={city.name}>
                          <div className="tzc-availcity">
                            <select value={a.start} onChange={e => setAvail(city.name, { start: Number(e.target.value) })}>
                              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{formatHourLabel(h)}</option>)}
                            </select>
                            <span>to</span>
                            <select value={a.end} onChange={e => setAvail(city.name, { end: Number(e.target.value) })}>
                              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h === 0 ? 24 : h}>{formatHourLabel(h === 0 ? 24 : h)}</option>)}
                            </select>
                            {(a.start !== 9 || a.end !== 17) && (
                              <button className="tzc-resetlink" onClick={() => resetAvail(city.name)}>Reset</button>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                  {gridRows.map((row, idx) => (
                    <tr key={idx} className={idx === 0 ? "now" : ""}>
                      <td className="utc">{formatUTCCell(row.instant)}</td>
                      {row.cells.map(cell => (
                        <td key={cell.city.name}>
                          <span className={`tzc-cell-tag ${cell.overlap ? "work-overlap" : cell.category}`}>
                            {cell.label}{cell.dst ? " *" : ""}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="tzc-rangebar">
              {[1, 3, 7].map(d => (
                <button key={d} className={rangeDays === d ? "active" : ""} onClick={() => setRangeDays(d)}>
                  {d === 1 ? "24h" : `${d}d`}
                </button>
              ))}
            </div>
          </div>

          <div className="tzc-legend">
            <span><i className="tzc-legend-dot" style={{ background: "var(--work-bg)" }} /> working (9am-5pm)</span>
            <span><i className="tzc-legend-dot" style={{ background: "var(--work-bright-bg)" }} /> working, overlaps another city</span>
            <span><i className="tzc-legend-dot" style={{ background: "var(--awake-bg)" }} /> awake (7-9am, 5-10pm)</span>
            <span><i className="tzc-legend-dot" style={{ background: "var(--sleep-bg)" }} /> asleep (10pm-7am)</span>
          </div>

          <div className="tzc-dstnote">* means that city is currently observing daylight saving time.</div>
        </div>
        )}
      </div>
    </div>
  );
}

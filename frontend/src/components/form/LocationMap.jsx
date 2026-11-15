import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function LocationMap({ latitude, longitude, onSelect, mapRef }) {
  const container = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const selectRef = useRef(onSelect);
  const [failed, setFailed] = useState(false);
  selectRef.current = onSelect;
  useEffect(() => {
    const instance = L.map(container.current, { scrollWheelZoom: false, zoomControl: false }).setView([9.9, -84.1], 7);
    map.current = instance;
    const choose = point => selectRef.current({ latitude: point.lat.toFixed(6), longitude: point.lng.toFixed(6) });
    instance.on('click', e => choose(e.latlng));
    L.control.zoom({ position: 'bottomright' }).addTo(instance);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19,
    }).on('tileerror', () => setFailed(true)).addTo(instance);
    const keyHandler = e => { if (e.key === 'Enter') { e.preventDefault(); choose(instance.getCenter()); } };
    container.current.addEventListener('keydown', keyHandler);
    const element = container.current;
    const resize = new ResizeObserver(() => instance.invalidateSize()); resize.observe(element);
    return () => { resize.disconnect(); element.removeEventListener('keydown', keyHandler); instance.remove(); map.current = null; marker.current = null; };
  }, []);
  useEffect(() => {
    const lat = Number(latitude), lng = Number(longitude);
    if (!map.current) return;
    if (String(latitude).trim() === '' || String(longitude).trim() === '' || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      marker.current?.remove(); marker.current = null; return;
    }
    const point = [lat, lng];
    if (!marker.current) {
      marker.current = L.marker(point, { draggable: true, keyboard: true, title: 'Ubicación seleccionada', icon: L.divIcon({ className: 'farm-map-pin', html: '<span></span>', iconSize: [26, 36], iconAnchor: [13, 36] }) }).addTo(map.current);
      marker.current.on('dragend', () => { const p = marker.current.getLatLng(); selectRef.current({ latitude: p.lat.toFixed(6), longitude: p.lng.toFixed(6) }); });
    } else marker.current.setLatLng(point);
    map.current.panTo(point, { animate: false });
  }, [latitude, longitude]);
  return <section className="farm-map-card" aria-label="Ubicación en el mapa">
    <div ref={element => { container.current = element; if (mapRef) mapRef.current = element; }} className="farm-map" tabIndex={0} role="region" aria-label="Mapa interactivo. Pulsa para elegir ubicación o usa flechas y Enter para elegir el centro." />
    <div className="farm-map-help">{failed ? 'No pudimos cargar el mapa. Puedes escribir tus coordenadas en el formulario.' : 'Toca el mapa para ubicar tu finca. Puedes mover el marcador.'}</div>
    {String(latitude).trim() && String(longitude).trim() && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude)) && <a className="farm-map-external" target="_blank" rel="noopener noreferrer" href={`https://www.openstreetmap.org/?mlat=${Number(latitude)}&mlon=${Number(longitude)}#map=13/${Number(latitude)}/${Number(longitude)}`}>↗ Abrir en OpenStreetMap</a>}
  </section>;
}

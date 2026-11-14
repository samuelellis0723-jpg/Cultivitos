import { Routes, Route, Link } from 'react-router-dom';
import HomePage from '../pages/HomePage.jsx';
export default function Routing() {
  return <Routes><Route path="/" element={<HomePage />} /><Route path="*" element={<main><h1>Página no encontrada</h1><Link to="/">Volver al inicio</Link></main>} /></Routes>;
}

import { Route, Routes } from 'react-router-dom';
import ComparaPage from '../pages/ComparaPage.jsx';
import ExploraPage from '../pages/ExploraPage.jsx';
import MiFincaPage from '../pages/MiFincaPage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';

export default function Routing() {
  return (
    <Routes>
      <Route path="/" element={<MiFincaPage />} />
      <Route path="/explora" element={<ExploraPage />} />
      <Route path="/compara" element={<ComparaPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

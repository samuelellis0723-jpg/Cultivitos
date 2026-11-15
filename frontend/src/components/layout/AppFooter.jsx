export default function AppFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="fv-footer">
      <div className="fv-footer-inner">
        <div>
          <strong>Fieldverse</strong> — Prototipo comparativo agroclimático (Cultivitos)
        </div>
        <div>
          No predice cosechas absolutas ni sustituye asesoría técnica en campo · {year}
        </div>
      </div>
    </footer>
  );
}

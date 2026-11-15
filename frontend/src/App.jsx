import AppFooter from './components/layout/AppFooter.jsx';
import AppHeader from './components/layout/AppHeader.jsx';
import { FieldverseProvider } from './context/FieldverseContext.jsx';
import Routing from './routes/Routing.jsx';

export default function App() {
  return (
    <FieldverseProvider>
      <div className="fv-app-shell">
        <AppHeader />
        <main id="main-content" className="fv-main">
          <Routing />
        </main>
        <AppFooter />
      </div>
    </FieldverseProvider>
  );
}

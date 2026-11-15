import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './assets/styles/tokens.css';
import './assets/styles/global.css';
import './assets/styles/components.css';
import './assets/styles/motion.css';
import './assets/styles/farm.css';
import './assets/styles/print.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

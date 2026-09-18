import React from 'react';
import ReactDOM from 'react-dom/client';
import DoctorApp from './DoctorApp';
import './index.css';

const rootElement = document.getElementById('doctor-root') || document.getElementById('root');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <DoctorApp />
  </React.StrictMode>
);

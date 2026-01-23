import { useRef, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { StatusBar } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Toast } from '@capacitor/toast';

import Home from './pages/Home';
import EscobaPage from './pages/EscobaPage';
import ChinchonPage from './pages/ChinchonPage';
import { JodetePage, TrucoPage } from './pages/ComingSoon';

// Logic to handle Android Back Button
const BackButtonHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const lastBackPress = useRef(0);
  const locationRef = useRef(location);

  // Keep locationRef updated
  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let backListener = null;

    const setupListener = async () => {
      backListener = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        const currentPath = locationRef.current.pathname;

        // In HashRouter, root might be '/' or empty, but usually '/' 
        if (currentPath === '/' || currentPath === '') {
          const now = Date.now();
          if (now - lastBackPress.current < 2000) {
            CapacitorApp.exitApp();
          } else {
            lastBackPress.current = now;
            Toast.show({
              text: 'Presiona otra vez para salir',
              duration: 'short',
              position: 'bottom',
            });
          }
        } else {
          // If NOT at root, go back
          navigate(-1);
        }
      });
    };

    setupListener();

    return () => {
      if (backListener) {
        backListener.remove();
      }
    };
  }, [navigate]);

  return null;
};

function App() {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.hide().catch(console.error);
    }
  }, []);

  return (
    <Router>
      <BackButtonHandler />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/escoba" element={<EscobaPage />} />
        <Route path="/chinchon" element={<ChinchonPage />} />
        <Route path="/jodete" element={<JodetePage />} />
        <Route path="/truco" element={<TrucoPage />} />
      </Routes>
    </Router>
  );
}

export default App;

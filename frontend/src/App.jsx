import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import EscobaPage from './pages/EscobaPage';
import ChinchonPage from './pages/ChinchonPage';
import { JodetePage, TrucoPage } from './pages/ComingSoon';

import { useEffect } from 'react';
import { StatusBar } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
// import { NavigationBar } from '@hugotomazi/capacitor-navigation-bar'; // Tip: This implies adding another plugin if we want strict nav bar hiding, but let's stick to standard first.
// Actually, standard StatusBar.hide() combined with proper Android styles is safest. 
// Let's just use StatusBar.hide() for now which is standard.

function App() {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.hide().catch(console.error);
      // Android specific: Hide navigation bar if possible via simple styles or implicit fullscreen
    }
  }, []);

  return (
    <Router>
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

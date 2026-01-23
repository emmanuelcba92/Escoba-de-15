import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import EscobaPage from './pages/EscobaPage';
import ChinchonPage from './pages/ChinchonPage';
import { JodetePage, TrucoPage } from './pages/ComingSoon';

function App() {
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

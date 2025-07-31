import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import MapPage from './MapPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      {/* UPDATED LINE: */}
      <Route path="/app/:initialMode?" element={<MapPage />} />
    </Routes>
  );
}

export default App;
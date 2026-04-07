import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Directory from './pages/Directory';
import AdminPanel from './pages/AdminPanel';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Directory />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </BrowserRouter>
  );
}

import { Routes, Route } from 'react-router-dom';
import { AIPage } from './AI';

export const AIRoutes = () => (
  <Routes>
    <Route index element={<AIPage />} />
  </Routes>
);
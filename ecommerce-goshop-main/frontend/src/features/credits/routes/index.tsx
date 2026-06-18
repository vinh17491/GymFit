import { Routes, Route } from 'react-router-dom';
import { CreditsPage } from './Credits';

export const CreditsRoutes = () => (
  <Routes>
    <Route index element={<CreditsPage />} />
  </Routes>
);
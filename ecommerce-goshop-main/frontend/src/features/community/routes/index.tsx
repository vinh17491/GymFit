import { Routes, Route } from 'react-router-dom';
import { CommunityList, CommunityDetail, CommunityNew } from './Community';

export const CommunityRoutes = () => (
  <Routes>
    <Route index element={<CommunityList />} />
    <Route path="new" element={<CommunityNew />} />
    <Route path=":id" element={<CommunityDetail />} />
  </Routes>
);
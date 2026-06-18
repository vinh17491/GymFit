import { Routes, Route } from 'react-router-dom';
import { VideoList, VideoDetail } from './Videos';

export const VideoRoutes = () => (
  <Routes>
    <Route index element={<VideoList />} />
    <Route path=":id" element={<VideoDetail />} />
  </Routes>
);
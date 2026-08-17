import { Suspense } from 'react';
import { Routes } from 'react-router-dom';
import CommandMenu from './components/layout/CommandMenu';
import ChatbotWidget from './features/chatbot/ChatbotWidget';
import {
  authRouteElements,
  fallbackRouteElements,
  protectedRouteElements,
  publicRouteElements,
} from './routes/routeGroups';

function RouteLoading() {
  return <div className="flex min-h-[40vh] items-center justify-center text-slate-400" role="status" aria-live="polite">Loading page…</div>;
}

export default function App() {
  return (
    <>
      <CommandMenu />
      <ChatbotWidget />
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          {publicRouteElements}
          {authRouteElements}
          {protectedRouteElements}
          {fallbackRouteElements}
        </Routes>
      </Suspense>
    </>
  );
}

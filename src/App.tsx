import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, ProtectedRoute } from './components/auth';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { PluginsProvider } from './contexts/PluginsContext';
import AppContent from './components/app/AppContent';
import i18n from './i18n/config.js';

export default function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <AuthProvider>
          <WebSocketProvider>
            <PluginsProvider>
                <ProtectedRoute>
                  <Router basename={window.__ROUTER_BASENAME__ || ''}>
                    <Routes>
                      <Route path="/" element={<AppContent />} />
                      <Route path="/session/:sessionId" element={<AppContent />} />
                      {/* Mobile-specific routes — all map to AppContent for state continuity */}
                      <Route path="/conversations" element={<AppContent />} />
                      <Route path="/session/:sessionId/files" element={<AppContent />} />
                      <Route path="/session/:sessionId/git" element={<AppContent />} />
                      <Route path="/settings" element={<AppContent />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Router>
                </ProtectedRoute>
            </PluginsProvider>
          </WebSocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </I18nextProvider>
  );
}

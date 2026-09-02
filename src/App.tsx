import { useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth/AuthContext';
import { AppShell, type TabId } from '@/components/AppShell';
import { AuthScreen } from '@/screens/AuthScreen';
import { TodayScreen } from '@/screens/TodayScreen';
import { HistoryScreen } from '@/screens/HistoryScreen';
import { InsightsScreen } from '@/screens/InsightsScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { LoadingScreen } from '@/components/ui/Loading';

function AppContent() {
  const { session, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('today');

  if (loading) return <LoadingScreen />;
  if (!session) return <AuthScreen />;

  return (
    <AppShell activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'today' && <TodayScreen userId={session.user.id} />}
      {activeTab === 'history' && <HistoryScreen />}
      {activeTab === 'insights' && <InsightsScreen />}
      {activeTab === 'settings' && <SettingsScreen />}
    </AppShell>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

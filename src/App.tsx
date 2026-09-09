import { useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth/AuthContext';
import { AppShell, type TabId } from '@/components/AppShell';
import { AuthScreen } from '@/screens/AuthScreen';
import { TodayScreen } from '@/screens/TodayScreen';
import { HistoryScreen } from '@/screens/HistoryScreen';
import { InsightsScreen } from '@/screens/InsightsScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { LoadingScreen } from '@/components/ui/Loading';

// When set, only this account may use the app; when empty, anyone who signs in may.
const OWNER_EMAIL = (import.meta.env.VITE_OWNER_EMAIL as string | undefined)?.trim() || null;

function AppContent() {
  const { session, loading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('today');

  if (loading) return <LoadingScreen />;
  if (!session) return <AuthScreen />;

  if (OWNER_EMAIL && session.user.email !== OWNER_EMAIL) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-stone-50 px-6 text-center">
        <p className="text-stone-700">This account isn't authorized to use this app.</p>
        <button onClick={signOut} className="text-teal-600 hover:text-teal-700">
          Sign out
        </button>
      </div>
    );
  }

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

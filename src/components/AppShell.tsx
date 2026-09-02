import { type ReactNode } from 'react';
import { Home, ClipboardList, BarChart3, Settings } from 'lucide-react';

export type TabId = 'today' | 'history' | 'insights' | 'settings';

interface AppShellProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  children: ReactNode;
}

const tabs: { id: TabId; label: string; icon: typeof Home }[] = [
  { id: 'today', label: 'Today', icon: Home },
  { id: 'history', label: 'History', icon: ClipboardList },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function AppShell({ activeTab, onTabChange, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 pt-6 pb-24 sm:pb-28">
        {children}
      </main>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 shadow-sm z-40">
        <div className="max-w-2xl mx-auto flex items-stretch">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors ${
                  active ? 'text-teal-600' : 'text-stone-400 hover:text-stone-600'
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                <span className={`text-xs ${active ? 'font-semibold' : 'font-medium'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

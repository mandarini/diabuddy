import { Loader2 } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <Loader2 className="animate-spin text-teal-600" size={32} />
    </div>
  );
}

export function Spinner({ size = 20 }: { size?: number }) {
  return <Loader2 className="animate-spin text-teal-600" size={size} />;
}

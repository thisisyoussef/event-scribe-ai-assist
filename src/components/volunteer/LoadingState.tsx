
import { Card, CardContent } from "@/components/ui/card";

const LoadingState = () => {
  return (
    <div className="min-h-screen bg-white/5 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gold-300">Loading event details...</p>
      </div>
    </div>
  );
};

export default LoadingState;


import { Card, CardContent } from "@/components/ui/card";

const LoadingState = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-100 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-amber-700">Loading event details...</p>
      </div>
    </div>
  );
};

export default LoadingState;

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Home, Camera, Users, Settings } from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { toast } = useToast();
  const [location, navigate] = useLocation();

  // Determine which nav item is active based on current path
  const getNavItemClass = (path: string) => {
    const isActive = location === path || (path === '/app' && location === '/');
    return isActive 
      ? "flex flex-col items-center p-3 text-blue-600 bg-blue-50 rounded-xl" 
      : "flex flex-col items-center p-3 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors";
  };

  return (
    <div className="relative min-h-screen">
      {/* Main content */}
      <div className="pb-20 lg:pb-0">
        {children}
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav bg-white/90 backdrop-blur-lg border-t border-slate-200 lg:hidden fixed bottom-0 left-0 right-0 z-50 shadow-lg">
        <div className="flex justify-around py-3">
          <Button 
            variant="ghost" 
            className={getNavItemClass('/app')}
            onClick={() => navigate('/app')}
            data-testid="nav-home"
          >
            <Home className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Home</span>
          </Button>
          <Button 
            variant="ghost" 
            className={getNavItemClass('/app/upload')}
            onClick={() => navigate('/app/upload')}
            data-testid="nav-upload"
          >
            <Camera className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Upload</span>
          </Button>
          <Button 
            variant="ghost" 
            className={getNavItemClass('/app/children')}
            onClick={() => navigate('/app/children')}
            data-testid="nav-children"
          >
            <Users className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Children</span>
          </Button>
          <Button 
            variant="ghost" 
            className="flex flex-col items-center p-3 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
            onClick={() => toast({ title: "Settings", description: "Settings panel is coming soon!" })}
            data-testid="nav-settings"
          >
            <Settings className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Settings</span>
          </Button>
        </div>
      </nav>
    </div>
  );
}
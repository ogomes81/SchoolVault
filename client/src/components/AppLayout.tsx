import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Home, Camera, Users, Settings, GraduationCap, LogOut } from "lucide-react";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useChild } from "@/contexts/ChildContext";
import ChildSelector from "@/components/ChildSelector";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const { signOut } = useAuthGuard();
  const { children: childrenData, selectedChild, setSelectedChild } = useChild();

  // Determine which nav item is active based on current path
  const getNavItemClass = (path: string) => {
    const isActive = location === path || (path === '/app' && location === '/');
    return isActive 
      ? "flex flex-col items-center p-3 text-blue-600 bg-blue-50 rounded-xl" 
      : "flex flex-col items-center p-3 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold hidden sm:block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">SchoolVault</h1>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={signOut} data-testid="button-signout">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Child Selector Below Header - Only show on home page */}
      {location === '/app' && (
        <div className="bg-white/50 border-b border-slate-100 px-4 sm:px-6 lg:px-8 py-3">
          <div className="max-w-7xl mx-auto">
            <ChildSelector
              children={childrenData}
              selectedChildId={selectedChild}
              onChildChange={setSelectedChild}
              includeAll={false}
            />
          </div>
        </div>
      )}

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
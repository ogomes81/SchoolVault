import { useEffect, useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { initAuth, getCurrentUser } from "@/lib/supabase";
import AuthPage from "@/pages/AuthPage";
import DashboardPage from "@/pages/DashboardPage";
import UploadPage from "@/pages/UploadPage";
import DocumentDetailPage from "@/pages/DocumentDetailPage";
import PublicSharePage from "@/pages/PublicSharePage";
import ChildrenPage from "@/pages/ChildrenPage";
import NotFound from "@/pages/not-found";

function Router() {
  const [initialized, setInitialized] = useState(false);
  const [hasUser, setHasUser] = useState(false);
  
  useEffect(() => {
    const user = initAuth();
    setHasUser(!!user);
    setInitialized(true);
  }, []);
  
  if (!initialized) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/app" component={DashboardPage} />
      <Route path="/app/upload" component={UploadPage} />
      <Route path="/app/children" component={ChildrenPage} />
      <Route path="/app/doc/:id" component={DocumentDetailPage} />
      <Route path="/s/:token" component={PublicSharePage} />
      <Route path="/">
        {() => {
          // Redirect to dashboard if we have a session, otherwise to auth
          if (hasUser) {
            window.location.href = '/app';
          } else {
            window.location.href = '/auth';
          }
          return null;
        }}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

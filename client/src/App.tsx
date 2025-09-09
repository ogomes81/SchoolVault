import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AuthPage from "@/pages/AuthPage";
import DashboardPage from "@/pages/DashboardPage";
import UploadPage from "@/pages/UploadPage";
import DocumentDetailPage from "@/pages/DocumentDetailPage";
import PublicSharePage from "@/pages/PublicSharePage";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/app" component={DashboardPage} />
      <Route path="/app/upload" component={UploadPage} />
      <Route path="/app/doc/:id" component={DocumentDetailPage} />
      <Route path="/s/:token" component={PublicSharePage} />
      <Route path="/">
        {() => {
          // Redirect to dashboard if we have a session, otherwise to auth
          window.location.href = '/app';
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

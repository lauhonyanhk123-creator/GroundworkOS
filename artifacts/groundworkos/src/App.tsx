import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { JobsPage } from "./pages/JobsPage";
import { QuotesPage } from "./pages/QuotesPage";
import { InvoicesPage } from "./pages/InvoicesPage";
import { SchedulePage } from "./pages/SchedulePage";
import { ClientsPage } from "./pages/ClientsPage";
import { SubcontractorsPage } from "./pages/SubcontractorsPage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { PlantPage } from "./pages/PlantPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";

const queryClient = new QueryClient();

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <div className="text-6xl font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#FFD600' }}>404</div>
      <p className="text-sm" style={{ color: '#666666' }}>Page not found</p>
    </div>
  );
}

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/jobs" component={JobsPage} />
        <Route path="/jobs/:id" component={JobsPage} />
        <Route path="/quotes" component={QuotesPage} />
        <Route path="/invoices" component={InvoicesPage} />
        <Route path="/schedule" component={SchedulePage} />
        <Route path="/clients" component={ClientsPage} />
        <Route path="/subcontractors" component={SubcontractorsPage} />
        <Route path="/documents" component={DocumentsPage} />
        <Route path="/plant" component={PlantPage} />
        <Route path="/reports" component={ReportsPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;

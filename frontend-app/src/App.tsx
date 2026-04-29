import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { RequireAuth } from "./components/RequireAuth";
import { ApplicationDetailPage } from "./pages/ApplicationDetailPage";
import { ApplicationsCreatePage } from "./pages/ApplicationsCreatePage";
import { ApplicationsPage } from "./pages/ApplicationsPage";
import { CertificatesRegistryPage } from "./pages/CertificatesRegistryPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { LookupsPage } from "./pages/LookupsPage";
import { ProfilePage } from "./pages/ProfilePage";

function ApplicationDetailRoute() {
  const { id } = useParams();
  return <ApplicationDetailPage key={id ?? ""} />;
}

export function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route
          path="applications"
          element={
            <RequireAuth>
              <ApplicationsPage />
            </RequireAuth>
          }
        />
        <Route
          path="applications/new"
          element={
            <RequireAuth>
              <ApplicationsCreatePage />
            </RequireAuth>
          }
        />
        <Route
          path="applications/certificates"
          element={
            <RequireAuth>
              <CertificatesRegistryPage />
            </RequireAuth>
          }
        />
        <Route
          path="applications/:id"
          element={
            <RequireAuth>
              <ApplicationDetailRoute />
            </RequireAuth>
          }
        />
        <Route
          path="lookups"
          element={
            <RequireAuth>
              <LookupsPage />
            </RequireAuth>
          }
        />
        <Route
          path="profile"
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
        />
        <Route path="password" element={<Navigate to="/profile" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

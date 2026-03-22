import { Routes, Route } from "react-router-dom";
import { RouteScrollManager } from "./components/RouteScrollManager";
import { Home } from "./pages/Home";
import { PrivacyPolicyPage } from "./pages/PrivacyPolicyPage";
import { TermsOfServicePage } from "./pages/TermsOfServicePage";
import { CookiePolicyPage } from "./pages/CookiePolicyPage";

function App() {
  return (
    <>
      <RouteScrollManager />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />
        <Route path="/cookies" element={<CookiePolicyPage />} />
      </Routes>
    </>
  );
}

export default App;

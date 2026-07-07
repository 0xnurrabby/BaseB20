import { useEffect, useRef } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { useAccount, useChainId } from "wagmi";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { Create } from "./pages/Create";
import { Dashboard } from "./pages/Dashboard";
import { Docs } from "./pages/Docs";
import { Admin } from "./pages/Admin";
import { trackEvent } from "./lib/analytics";

export default function App() {
  const location = useLocation();
  const chainId = useChainId();
  const { address } = useAccount();
  const lastTracked = useRef("");

  useEffect(() => {
    const pagePath = `${location.pathname}${location.search}`;
    if (lastTracked.current === pagePath) return;
    lastTracked.current = pagePath;
    trackEvent({ eventType: "page_view", pagePath, chainId, wallet: address });
  }, [location.pathname, location.search, chainId, address]);

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<Create />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/:address" element={<Dashboard />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </Layout>
  );
}

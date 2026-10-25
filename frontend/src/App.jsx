import { useEffect, useState } from "react";

import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Chatbot from "./components/Chatbot";

import Dashboard from "./pages/Dashboard";
import Analyze from "./pages/Analyze";
import LiveDetection from "./pages/LiveDetection";
import Results from "./pages/Results";
import About from "./pages/About";


import { checkBackend } from "./services/api";


function App() {

  const [activePage, setActivePage] = useState("dashboard");

  useEffect(() => {
    checkBackend()
      .then((data) => console.log("✅ Backend connected:", data))
      .catch((error) => console.error("❌ Backend connection failed:", error));
  }, []);

  const renderPage = () => {
    switch (activePage) {
      case "analyze":
        return <Analyze />;
      case "live":
        return <LiveDetection />;
      case "results":
        return <Results />;
      case "about":
        return <About />;
      case "dashboard":
      default:
        return <Dashboard onNavigate={setActivePage} />;
    }
  };

  return (
    <div className="app">

      <Navbar onNavigate={setActivePage} />

      <div className="app-body">

        <Sidebar activePage={activePage} onNavigate={setActivePage} />

        <main className="main-content">
          {renderPage()}
        </main>

      </div>

      {/* Floating cattle chatbot (bottom-right) */}
      <Chatbot />

    </div>
  );
}

export default App;
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import AllNotificationsPage from "./pages/AllNotificationsPage";
import PriorityNotificationsPage from "./pages/PriorityNotificationsPage";

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<AllNotificationsPage />} />
        <Route path="/priority" element={<PriorityNotificationsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

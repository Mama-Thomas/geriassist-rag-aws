import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "./Landing";
import GeriAssist from "./GeriAssist";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/chat" element={<GeriAssist />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

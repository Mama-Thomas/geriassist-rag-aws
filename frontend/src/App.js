import { useState } from "react";
import Landing from "./Landing";
import GeriAssist from "./GeriAssist";

function App() {
  const [page, setPage] = useState("landing");

  if (page === "chat") {
    return <GeriAssist onBack={() => setPage("landing")} />;
  }

  return <Landing onEnterChat={() => setPage("chat")} />;
}

export default App;

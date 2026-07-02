import React from "react";
import ReactDOM from "react-dom/client";
import CssBaseline from "@mui/material/CssBaseline";
import { setLogToken } from "logging-middleware";
import App from "./App";

// set the token once at startup so Log() can use it later
setLogToken(import.meta.env.VITE_LOG_ACCESS_TOKEN || "");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CssBaseline />
    <App />
  </React.StrictMode>
);

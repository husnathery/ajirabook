// Polyfill for Promise.withResolvers (required for react-pdf in older browsers)
import withResolvers from "promise.withresolvers";
withResolvers.shim();

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

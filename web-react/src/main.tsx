import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./styles.css";

// biome-ignore lint/style/noNonNullAssertion: index.html always has #root
createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<App />
	</StrictMode>,
);

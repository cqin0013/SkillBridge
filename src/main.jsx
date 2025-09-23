
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles/index.css";

import { message } from "antd";
import { setCacheNotifier } from "./utils/cache";


setCacheNotifier(({ message: text }) => {
  message.error(text);
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);

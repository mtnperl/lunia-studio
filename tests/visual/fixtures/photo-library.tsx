import React from "react";
import { createRoot } from "react-dom/client";
import PhotoLibrary from "../../../src/components/campaign/PhotoLibrary";

createRoot(document.getElementById("root")!).render(<PhotoLibrary onPick={(asset) => {
  document.getElementById("picked")!.textContent = asset.id;
}} />);

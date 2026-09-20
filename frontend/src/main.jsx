import React from "react";
import ReactDOM from "react-dom/client";

function showError(label, err) {
  var pre = document.createElement("pre");
  pre.style.cssText = "white-space:pre-wrap;color:#f87171;background:#1e293b;padding:16px;font-size:13px;";
  pre.textContent = label + "\n\n" + (err && (err.stack || err.message) ? (err.stack || err.message) : String(err));
  document.body.appendChild(pre);
}

window.addEventListener("error", function (e) {
  showError("window error", e.error || e.message);
});
window.addEventListener("unhandledrejection", function (e) {
  showError("unhandled rejection", e.reason);
});

import("./App.jsx")
  .then(function (mod) {
    var App = mod.default;
    try {
      var root = ReactDOM.createRoot(document.getElementById("root"));
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
    } catch (err) {
      showError("render error", err);
    }
  })
  .catch(function (err) {
    showError("import error", err);
  });

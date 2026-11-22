import { Component, type ReactNode } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import { ForgeProvider } from "./state/Store";
import { AssetsPage } from "./ui/AssetsPage";
import { Home } from "./ui/Home";
import { NewProject } from "./ui/NewProject";
import { SettingsPage } from "./ui/SettingsPage";
import { Shell } from "./ui/Shell";
import { Studio } from "./ui/Studio";

export function App() {
  return (
    <ErrorBoundary>
      <ForgeProvider>
        <HashRouter>
          <div className="app">
            <div className="atmosphere" aria-hidden="true" />
            <Routes>
              <Route element={<Shell />}>
                <Route path="/" element={<Home />} />
                <Route path="/new" element={<NewProject />} />
                <Route path="/project/:id" element={<Studio />} />
                <Route path="/assets" element={<AssetsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Routes>
          </div>
        </HashRouter>
      </ForgeProvider>
    </ErrorBoundary>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { message: string }> {
  state = { message: "" };

  static getDerivedStateFromError(error: Error) {
    return { message: error.message || "Something broke in the workshop." };
  }

  render() {
    if (!this.state.message) return this.props.children;
    return (
      <main className="page">
        <h1>Forge hit a snag</h1>
        <p>{this.state.message}</p>
        <button type="button" className="primary" onClick={() => window.location.reload()}>Reload</button>
      </main>
    );
  }
}

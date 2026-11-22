import { NavLink, Outlet, useMatch } from "react-router-dom";
import { Logo } from "./Logo";
import { useForge } from "../state/Store";

export function Shell() {
  const { link } = useForge();
  const inStudio = Boolean(useMatch("/project/:id"));
  const label = link.status === "online" ? "Online" : link.status === "offline" ? "Offline" : "Checking";
  return (
    <div className="frame">
      <aside className="sidebar">
        <NavLink to="/" className="brand">
          <Logo />
          <span className="word">Ollama <em>Forge</em></span>
        </NavLink>
        <nav className="side-nav" aria-label="Main">
          <NavLink to="/" end>Projects</NavLink>
          <NavLink to="/new">New</NavLink>
          <NavLink to="/assets">Assets</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>
        <p className={`side-status ${link.status}`} role="status">{label}</p>
      </aside>
      <div className="content">
        {inStudio ? null : (
          <header className="topbar">
            <NavLink to="/" className="brand brand-compact" aria-label="Ollama Forge home">
              <Logo size={36} />
              <span className="word">Forge</span>
            </NavLink>
            <p className={`status-pill ${link.status}`} role="status" data-testid="status-pill">{label}</p>
          </header>
        )}
        <Outlet />
      </div>
      {inStudio ? null : (
        <nav className="bottom-nav" aria-label="Main">
          <NavLink to="/" end data-testid="nav-projects">Projects</NavLink>
          <NavLink to="/assets" data-testid="nav-assets">Assets</NavLink>
          <NavLink to="/settings" data-testid="nav-settings">Settings</NavLink>
        </nav>
      )}
    </div>
  );
}

import { NavLink } from "react-router-dom";

export function Header() {
  return (
    <header className="landing-header">
      <nav aria-label="Main">
        <NavLink
          to="/demo1"
          className={({ isActive }) => (isActive ? "is-active" : undefined)}
        >
          Demo 1
        </NavLink>
        <NavLink
          to="/demo2"
          className={({ isActive }) => (isActive ? "is-active" : undefined)}
        >
          Demo 2
        </NavLink>
        <NavLink
          to="/info"
          className={({ isActive }) => (isActive ? "is-active" : undefined)}
        >
          Info
        </NavLink>
      </nav>
    </header>
  );
}

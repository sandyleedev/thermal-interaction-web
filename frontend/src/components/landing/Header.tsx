import { NavLink } from "react-router-dom";

export function Header() {
  return (
    <header className="landing-header">
      <nav aria-label="Main">
        <NavLink
          to="/"
          className={({ isActive }) => (isActive ? "is-active" : undefined)}
        >
          Main
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

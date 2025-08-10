import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import Search from './pages/Search';
import Insight from './pages/Insight';
import './App.css';
import Home from "./pages/Home";

function App() {
  return (
    <Router>
      <nav className="navbar">
        <div className="nav-links">
          <NavLink to="/Home" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            Home
          </NavLink>
          <NavLink to="/Search" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            Search
          </NavLink>
          <NavLink to="/Insight" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            Conclusion
          </NavLink>
        </div>
      </nav>

      <div className="content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/Home" element={<Home />} />
          <Route path="/Search" element={<Search />} />
          <Route path="/Insight" element={<Insight />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

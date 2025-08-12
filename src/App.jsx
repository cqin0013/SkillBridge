import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import Search from './pages/Search/Search.jsx';
import Insight from './pages/Insight/Insight.jsx';
import './App.css';
import MainLayout from "./layouts/MainLayout";
import Home from "./pages/Home/Home.jsx";

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<MainLayout />}>
          
          <Route index element={<Home />} />
          <Route path="/" element={<Home />} />
          <Route path="/Home" element={<Home />} />
          <Route path="/Search" element={<Search />} />
          <Route path="/Insight" element={<Insight />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;

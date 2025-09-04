import { Outlet } from "react-router-dom";
import Header from "../components/Header/Header";
import Footer from "../components/Footer/Footer";

export default function MainLayout() {
  return (
    <div className="app-shell">
      <Header />
      {/* 主内容容器：统一在这里为固定 Footer 预留底部空间 */}
      <main className="app-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

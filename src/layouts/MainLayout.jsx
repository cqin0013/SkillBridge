import { Outlet } from "react-router-dom";
import Header from "../components/Header/Header"; // 或 "@/components/Header/Header"

export default function MainLayout() {
  return (
    <>
      <Header />
      <Outlet />
    </>
  );
}

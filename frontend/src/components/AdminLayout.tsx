import { Outlet } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";

export function AdminLayout() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] bg-background">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto lg:pl-64 pl-0">
        <div className="h-full p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

import { Outlet } from "react-router-dom";

export function AdminLayout() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-background w-full">
      <main className="flex-1 w-full overflow-y-auto">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

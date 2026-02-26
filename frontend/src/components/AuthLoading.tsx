import { AppBackground } from "./AppBackground";
import { Loader2 } from "lucide-react";

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-muted/20 rounded ${className}`} />
);

export const AuthLoading = () => {
  return (
    <div className="relative isolate min-h-screen bg-background text-foreground">
      <AppBackground />

      {/* Fake Navigation Bar */}
      <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur flex h-14 items-center px-4">
        <div className="mr-4 flex items-center space-x-2">
          {/* Logo Placeholder */}
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-6 w-24 hidden md:block" />
        </div>

        {/* Nav Links Placeholder */}
        <div className="flex items-center space-x-6 ml-4">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-16" />
        </div>

        <div className="flex flex-1 items-center justify-end space-x-4">
          {/* Theme Toggle Placeholder */}
          <Skeleton className="h-9 w-9 rounded-md" />
          {/* Auth/Profile Placeholder */}
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </header>

      {/* Main Content Skeleton */}
      <main className="container mx-auto p-8 space-y-10">
        {/* Hero Section Skeleton */}
        <div className="space-y-4 max-w-2xl">
          <div className="flex items-center space-x-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">Authenticating...</span>
          </div>
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>

        {/* Grid/Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="border rounded-lg p-6 space-y-4 bg-background/40 backdrop-blur-sm"
            >
              <Skeleton className="h-40 w-full rounded-md" />
              <Skeleton className="h-6 w-3/4" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

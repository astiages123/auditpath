import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { useLocation } from 'react-router-dom';
import { ROUTES } from '@/utils/routes';

export function PageHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-2 mb-8 animate-pulse">
      <Skeleton className="h-10 w-64 md:w-96" />
      <Skeleton className="h-4 w-48 md:w-64" />
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="p-6">
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <Card className={`p-6 ${className}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="size-6 rounded-full" />
        </div>
        <Skeleton className="h-32 w-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    </Card>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between mb-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-10 w-24" />
      </div>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex gap-4 items-center">
          <Skeleton className="size-12 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

export function HomeProgressSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-pulse">
      <Card className="p-6 h-[180px]">
        <div className="flex gap-4 h-full">
          <Skeleton className="w-24 h-full rounded-2xl" />
          <div className="flex-1 space-y-3 py-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        </div>
      </Card>
      {[1, 2, 3].map((i) => (
        <Card key={i} className="p-6 h-[180px] flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-xl" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-8 w-32" />
          </div>
          <Skeleton className="h-4 w-full" />
        </Card>
      ))}
    </div>
  );
}

export function CategoryGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="p-6 min-h-[160px]">
          <div className="flex flex-col gap-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Skeleton className="size-12 rounded-2xl" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
              <Skeleton className="size-6 rounded-full" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-12" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function LibraryCardSkeleton() {
  return (
    <Card className="rounded-[2.5rem] overflow-hidden animate-pulse border-border/40">
      <div className="p-5 md:p-8 space-y-4 md:space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>

        <div className="flex items-center gap-4">
          <Skeleton className="size-10 md:size-14 rounded-xl md:rounded-2xl" />
          <Skeleton className="h-6 md:h-8 w-1/2" />
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      </div>

      <div className="px-5 py-4 md:px-8 md:py-5 bg-secondary/30 border-t border-border/30 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-4 w-20" />
      </div>
    </Card>
  );
}

export function EfficiencyPageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Skeleton className="h-[320px] rounded-[2.5rem]" />
        <Skeleton className="h-[320px] rounded-[2.5rem]" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Skeleton className="h-[280px] rounded-[2.5rem]" />
        <Skeleton className="h-[280px] rounded-[2.5rem]" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Skeleton className="h-[350px] rounded-[2.5rem]" />
        <Skeleton className="h-[350px] rounded-[2.5rem]" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Skeleton className="h-[250px] rounded-[2.5rem]" />
        <Skeleton className="h-[400px] rounded-[2.5rem]" />
      </div>
    </div>
  );
}

export function LibraryGridSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse h-full">
      {/* Header Skeleton */}
      <PageHeaderSkeleton />

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Left Sidebar Skeleton (ToC) */}
        <aside className="hidden lg:flex flex-col w-72 border-r border-border/10 bg-card/20 rounded-xl p-8 space-y-8">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-2">
                <Skeleton className="size-5 rounded-md" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content Area Skeleton */}
        <div className="flex-1 bg-card/20 rounded-xl p-6 md:p-10 space-y-12">
          {[1, 2].map((section) => (
            <div key={section} className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Skeleton className="size-12 rounded-2xl" />
                  <Skeleton className="h-8 w-48" />
                </div>
                <Skeleton className="h-8 w-20 rounded-full" />
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <LibraryCardSkeleton key={i} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SplitLayoutSkeleton() {
  return (
    <div className="flex flex-col h-[calc(100vh-160px)] animate-pulse">
      <div className="flex-1 grid lg:grid-cols-[240px_1fr_220px] gap-4 min-h-0">
        {/* Left Global Navigation Skeleton */}
        <aside className="hidden lg:flex flex-col border rounded-xl bg-card overflow-hidden">
          <div className="p-4 space-y-4">
            <Skeleton className="h-8 w-full" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-lg" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content Area Skeleton */}
        <main className="flex flex-col border rounded-xl bg-card overflow-hidden">
          <div className="border-b border-border/10 p-6 flex items-center gap-4">
            <Skeleton className="size-10 rounded-xl" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <div className="p-10 space-y-8">
            <div className="space-y-4">
              <Skeleton className="h-10 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
            <Skeleton className="h-[400px] w-full rounded-2xl" />
            <div className="space-y-4 pt-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </main>

        {/* Right Local ToC Skeleton */}
        <aside className="hidden lg:flex flex-col border rounded-xl bg-card overflow-hidden">
          <div className="p-6 space-y-6">
            <Skeleton className="h-4 w-24" />
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-3 w-full" />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function DashboardHomeSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <PageHeaderSkeleton />
      <HomeProgressSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <CardSkeleton className="h-[320px]" />
        <CardSkeleton className="h-[320px]" />
      </div>
    </div>
  );
}

export function ContentSkeleton() {
  const { pathname } = useLocation();

  // Normalize path (remove trailing slash except for root)
  const path = pathname !== '/' ? pathname.replace(/\/$/, '') : pathname;

  if (path === ROUTES.HOME) {
    return <DashboardHomeSkeleton />;
  }

  // Exact matches for library pages
  if (path === ROUTES.NOTES || path === ROUTES.QUIZ) {
    return <LibraryGridSkeleton />;
  }

  // Sub-paths (course or topic specific)
  if (path.startsWith(ROUTES.NOTES) || path.startsWith(ROUTES.QUIZ)) {
    return <SplitLayoutSkeleton />;
  }

  return (
    <div className="space-y-6 animate-pulse">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardSkeleton className="h-[300px]" />
        <CardSkeleton className="h-[300px]" />
      </div>
    </div>
  );
}

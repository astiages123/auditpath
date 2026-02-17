import { Skeleton } from '@/components/ui/skeleton';
import { GlassCard } from '@/shared/GlassCard';

export function PageHeaderSkeleton() {
  return (
    <div className="flex items-center gap-5 mb-8">
      <Skeleton className="w-16 h-16 rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <GlassCard key={i} className="p-6">
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <GlassCard className={`p-6 ${className}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
        <Skeleton className="h-32 w-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    </GlassCard>
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
          <Skeleton className="h-12 w-12 rounded-lg" />
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
    <GlassCard className="p-8 mb-8 overflow-hidden relative">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-4">
          <Skeleton className="w-48 h-48 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6 w-full">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-4 w-full rounded-full" />
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

export function CategoryGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <GlassCard key={i} className="h-48 p-6 flex flex-col justify-between">
          <div className="space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-10 w-full" />
        </GlassCard>
      ))}
    </div>
  );
}

export function HeaderSkeleton() {
  return (
    <header className="relative w-full h-24 border-b border-border/10">
      <div className="container mx-auto h-full px-4 md:px-6 flex items-center justify-between pt-10">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="hidden md:flex items-center gap-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-4 w-20" />
          ))}
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="w-10 h-10 rounded-full" />
        </div>
      </div>
    </header>
  );
}

export function GlobalPageSkeleton() {
  return (
    <div className="flex flex-col min-h-screen animate-pulse">
      <HeaderSkeleton />
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12 space-y-8">
        <PageHeaderSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <CardSkeleton className="h-[320px]" />
          <CardSkeleton className="h-[320px]" />
        </div>
      </main>
    </div>
  );
}

import { Skeleton } from '@/components/ui/skeleton';
import { GlassCard } from '@/shared/components/GlassCard';

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
          <Skeleton className="size-6 rounded-full" />
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
      <GlassCard className="p-6 h-[180px]">
        <div className="flex gap-4 h-full">
          <Skeleton className="w-24 h-full rounded-2xl" />
          <div className="flex-1 space-y-3 py-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        </div>
      </GlassCard>
      {[1, 2, 3].map((i) => (
        <GlassCard
          key={i}
          className="p-6 h-[180px] flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-xl" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-8 w-32" />
          </div>
          <Skeleton className="h-4 w-full" />
        </GlassCard>
      ))}
    </div>
  );
}

export function CategoryGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <GlassCard key={i} className="p-6 min-h-[160px]">
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
        </GlassCard>
      ))}
    </div>
  );
}

export function LibraryCardSkeleton() {
  return (
    <GlassCard className="rounded-[2.5rem] overflow-hidden animate-pulse">
      <div className="p-8 space-y-6">
        <div className="flex items-start justify-between">
          <Skeleton className="size-14 rounded-2xl" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-8 w-1/2" />
        </div>
        <div className="space-y-3 pt-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-3 w-full rounded-full" />
        </div>
      </div>
      <div className="px-8 py-5 border-t border-border/30 flex justify-between items-center">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-24" />
      </div>
    </GlassCard>
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

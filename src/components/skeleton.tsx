import { cn } from '@/lib/utils';

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn('bg-gray-200 rounded animate-pulse', className)} />;
}

export function DocumentCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-3">
      <div className="flex items-center gap-4">
        <SkeletonBlock className="h-6 w-32" />
        <SkeletonBlock className="h-6 w-24" />
      </div>
      <SkeletonBlock className="h-4 w-48" />
      <div className="flex justify-between items-center pt-2">
        <SkeletonBlock className="h-4 w-32" />
        <SkeletonBlock className="h-8 w-16 rounded-lg" />
      </div>
    </div>
  );
}

export function HistoryCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 flex justify-between items-start">
      <div className="flex-1 space-y-2">
        <SkeletonBlock className="h-5 w-48" />
        <SkeletonBlock className="h-4 w-32" />
      </div>
      <div className="flex gap-6 ml-4">
        <SkeletonBlock className="h-8 w-10" />
        <SkeletonBlock className="h-8 w-10" />
        <SkeletonBlock className="h-8 w-10" />
      </div>
    </div>
  );
}

import { Skeleton } from '@/components/ui/skeleton'

interface TablePageSkeletonProps {
  rows?: number
  showToolbar?: boolean
}

export function TablePageSkeleton({ rows = 8, showToolbar = false }: TablePageSkeletonProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      {showToolbar && (
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="ml-auto h-9 w-24" />
        </div>
      )}
      <div className="rounded-md border">
        <div className="border-b px-4">
          <Skeleton className="my-3 h-4 w-full max-w-md" />
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b px-4 py-3 last:border-b-0">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

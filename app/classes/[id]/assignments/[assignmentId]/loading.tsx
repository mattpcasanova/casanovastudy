import NavigationHeader from "@/components/navigation-header"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-10 w-72 mb-6" />
        <Skeleton className="h-48" />
      </div>
    </div>
  )
}

import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { Skeleton } from "~/components/ui/skeleton";

/*
 * Renders data from the query cache without blocking navigation.
 *
 * The route does not wait on a server round trip. Instead the query is
 * prefetched on hover or on route intent, and this component reads the cache.
 * When the data is not there yet it shows a skeleton, so a slow network shows
 * a placeholder rather than a one or two second freeze. This is the acadacloud
 * approach: no route loader, useQuery in the component, skeleton while loading.
 */
export function QueryBoundary<T>({
  options,
  children,
  skeleton,
}: {
  options: UseQueryOptions<T>;
  children: (data: T) => React.ReactNode;
  skeleton?: React.ReactNode;
}) {
  const { data, isPending } = useQuery(options);

  if (isPending || data === undefined) {
    return <>{skeleton ?? <Skeleton className="h-40 w-full" />}</>;
  }

  return <>{children(data)}</>;
}

import { useEffect, useRef } from 'react'

export function useInfiniteScroll(onLoadMore: () => void, enabled: boolean = true) {
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const callbackRef = useRef(onLoadMore)

  useEffect(() => {
    callbackRef.current = onLoadMore
  })

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !enabled) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          callbackRef.current()
        }
      },
      { rootMargin: '160px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [enabled])

  return sentinelRef
}

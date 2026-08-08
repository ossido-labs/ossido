import type { JSX, MouseEvent, Ref } from 'react'
import { useCallback } from 'react'
import { useInView } from 'react-intersection-observer'

import { useRouter } from '../hooks/useRouter'
import { useRoute } from '../hooks/useRoute'

interface OssidoLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /**
   * If "true" the route gets loaded when the link enters the viewport.
   * @default true
   */
  preload?: boolean

  /**
   * If "false" the scroll offset will be kept across page navigation.
   * @default true
   */
  scroll?: boolean

  /**
   * If "true" the history entry will be replaced instead of pushed.
   * @default false
   */
  replace?: boolean

  /**
   * Forwarded to the underlying `<a>`, merged with the internal preload ref.
   * Lets wrappers (e.g. react-aria's `render`) connect their own ref.
   */
  ref?: Ref<HTMLAnchorElement>
}

function isEventModifierKeyActiveAndTargetDifferentFromSelf(
  event: MouseEvent<HTMLAnchorElement>,
): boolean {
  const target = event.currentTarget.getAttribute('target')
  return (
    (target && target !== '_self') ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey // triggers resource download
  )
}

export function Link(componentProps: OssidoLinkProps): JSX.Element {
  const {
    preload = true,
    scroll = true,
    children,
    href,
    replace,
    onClick,
    ref: forwardedRef,
    ...rest
  } = componentProps

  const router = useRouter()
  const route = useRoute(href)
  const { ref: inViewRef } = useInView({
    onChange(inView) {
      if (inView && preload) route?.component.preload?.()
    },
    triggerOnce: true,
  })

  // Merge the caller's ref (e.g. from react-aria's `render`) with the internal
  // in-view ref, so both receive the underlying `<a>` node. Memoised so the
  // callback ref identity is stable across renders.
  const setRef = useCallback(
    (node: HTMLAnchorElement | null): void => {
      inViewRef(node)
      if (typeof forwardedRef === 'function') {
        forwardedRef(node)
      } else if (forwardedRef) {
        forwardedRef.current = node
      }
    },
    [inViewRef, forwardedRef],
  )

  const handleTransition: React.MouseEventHandler<HTMLAnchorElement> = (
    event,
  ) => {
    onClick?.(event)

    if (
      href?.startsWith('#') ||
      // If the user is pressing a modifier key or using the target attribute,
      // we fall back to default behaviour of `a` tag
      isEventModifierKeyActiveAndTargetDifferentFromSelf(event)
    ) {
      return
    }

    event.preventDefault()

    const method = replace ? 'replace' : 'push'

    router[method](href || '', { scroll })
  }

  return (
    <a {...rest} href={href} ref={setRef} onClick={handleTransition}>
      {children}
    </a>
  )
}

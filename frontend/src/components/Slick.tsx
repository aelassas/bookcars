import React, {
  ComponentPropsWithRef,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import ReactSlick from 'react-slick'

import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'

/**
 * Threshold from which mouse movement with pressed mouse button
 * is considered a drag instead of a click.
 */
const MoveDragThreshold = 10

const useDragDetection = (): {
  handleMouseDown: () => void
  dragging: boolean
} => {
  const [mouseDown, setMouseDown] = useState(false)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    let mouseMove = 0

    const handleMouseUp = () => {
      setMouseDown(false)
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseMove += Math.abs(e.movementX) + Math.abs(e.movementY)
      setDragging(mouseMove > MoveDragThreshold)
    }

    if (mouseDown) {
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('mousemove', handleMouseMove)
    }

    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('mousemove', handleMouseMove)
    }
  }, [mouseDown])

  const handleMouseDown = () => {
    setMouseDown(true)
    setDragging(false)
  }

  return {
    handleMouseDown,
    dragging,
  }
}

interface SlickProps extends ComponentPropsWithRef<typeof ReactSlick> {
  children: React.ReactNode
}

const Slick = forwardRef<ReactSlick, SlickProps>(({ children, ...props }, ref) => {
  const slickRef = useRef<ReactSlick>(null)

  useImperativeHandle(
    ref,
    () =>
    ({
      ...slickRef.current,
    } as ReactSlick),
  )

  const {
    handleMouseDown,
    dragging,
  } = useDragDetection()

  const handleChildClick = (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    if (dragging) {
      e.preventDefault()
    }
  }

  return (
    <ReactSlick
      ref={slickRef}
      {...props}
    >
      {React.Children.map(children, (child) => (
        <div
          onMouseDownCapture={handleMouseDown}
          onClickCapture={handleChildClick}
          aria-modal="true"
        >
          {child}
        </div>
      ))}
    </ReactSlick>
  )
})

export default Slick

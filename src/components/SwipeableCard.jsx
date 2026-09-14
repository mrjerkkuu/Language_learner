import { useRef, useState } from 'react'

// -----------------------------------------------------------------------------
// SwipeableCard
// -----------------------------------------------------------------------------
// A generic draggable card that detects a horizontal swipe and reports the
// direction. It uses the Pointer Events API (works for touch, mouse and pen)
// with NO external gesture library, and a light CSS transform for the drag +
// exit animation.
//
// Props:
//   - onSwipeLeft  / onSwipeRight: called once when a swipe passes the threshold
//   - onTap: called on a tap (press without meaningful movement) — used to flip
//   - children: the card content (e.g. the flashcard front/back)
//
// In the Flashcards module: swipe LEFT = "hard", swipe RIGHT = "easy".
// (The third option, "medium", is a button below the card — 3 ratings but only
// 2 swipe directions.)
// -----------------------------------------------------------------------------

const SWIPE_THRESHOLD = 80 // px the card must travel before a swipe fires
const TAP_MAX = 10 // px below which a press counts as a tap (not a drag)
const EXIT_DISTANCE = 500 // px the card flies off screen on a committed swipe

export default function SwipeableCard({ onSwipeLeft, onSwipeRight, onTap, children }) {
  const [dx, setDx] = useState(0) // current horizontal offset
  const [dragging, setDragging] = useState(false) // finger/mouse currently down
  const [exiting, setExiting] = useState(false) // playing the fly-off animation
  const startX = useRef(0)

  // --- Pointer down: begin a drag ---
  function handlePointerDown(e) {
    if (exiting) return
    setDragging(true)
    startX.current = e.clientX
    // Capture the pointer so we keep getting move/up events even if the finger
    // leaves the element.
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  // --- Pointer move: follow the finger ---
  function handlePointerMove(e) {
    if (!dragging) return
    setDx(e.clientX - startX.current)
  }

  // --- Pointer up: decide swipe vs. snap back ---
  function handlePointerUp() {
    if (!dragging) return
    setDragging(false)

    if (dx > SWIPE_THRESHOLD) {
      commitSwipe('right')
    } else if (dx < -SWIPE_THRESHOLD) {
      commitSwipe('left')
    } else {
      // Not a swipe: if the pointer barely moved, treat it as a tap (flip);
      // otherwise it was a small drag, so just spring back to center.
      if (Math.abs(dx) < TAP_MAX) onTap?.()
      setDx(0)
    }
  }

  // Animate the card off screen, then fire the callback and reset for the next card.
  function commitSwipe(direction) {
    setExiting(true)
    setDx(direction === 'right' ? EXIT_DISTANCE : -EXIT_DISTANCE)
    // Wait for the CSS transition (200ms) before notifying + resetting.
    setTimeout(() => {
      if (direction === 'right') onSwipeRight?.()
      else onSwipeLeft?.()
      setExiting(false)
      setDx(0)
    }, 200)
  }

  // While actively dragging we want no transition (1:1 with the finger); when
  // releasing or exiting we animate smoothly.
  const transition = dragging ? 'none' : 'transform 200ms ease-out'
  // Small rotation makes the drag feel physical; fade out slightly as it leaves.
  const rotate = dx * 0.05
  const opacity = 1 - Math.min(Math.abs(dx) / 600, 0.6)

  return (
    <div className="relative select-none">
      {/* Directional hints that fade in as you drag. */}
      <SwipeHint side="left" visible={dx < -20} />
      <SwipeHint side="right" visible={dx > 20} />

      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          transform: `translateX(${dx}px) rotate(${rotate}deg)`,
          transition,
          opacity,
          touchAction: 'pan-y', // allow vertical page scroll, we handle horizontal
        }}
        className="cursor-grab active:cursor-grabbing"
      >
        {children}
      </div>
    </div>
  )
}

// Small overlay label shown while dragging toward one side.
function SwipeHint({ side, visible }) {
  const isRight = side === 'right'
  return (
    <div
      aria-hidden="true"
      className={
        'pointer-events-none absolute top-4 z-10 rounded-lg px-3 py-1 text-sm font-bold transition-opacity ' +
        (isRight
          ? 'right-4 bg-green-100 text-green-700'
          : 'left-4 bg-rose-100 text-rose-700') +
        (visible ? ' opacity-100' : ' opacity-0')
      }
    >
      {isRight ? 'Helppo →' : '← Vaikea'}
    </div>
  )
}

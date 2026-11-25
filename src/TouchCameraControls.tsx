import { useEffect, useRef } from 'react';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TOUCH_ORBIT_STEPS, nudgeOrbit } from './board3d/orbitNudge';

type TouchCameraControlsProps = {
  controlsRef: { current: OrbitControls | null };
};

const BUTTONS = [
  { label: 'TURN L', name: 'Rotate camera left', delta: { theta: TOUCH_ORBIT_STEPS.rotate } },
  { label: 'ZOOM +', name: 'Zoom in', delta: { radius: -TOUCH_ORBIT_STEPS.zoom } },
  { label: 'TURN R', name: 'Rotate camera right', delta: { theta: -TOUCH_ORBIT_STEPS.rotate } },
  { label: 'ZOOM -', name: 'Zoom out', delta: { radius: TOUCH_ORBIT_STEPS.zoom } },
] as const;

export function TouchCameraControls({ controlsRef }: TouchCameraControlsProps) {
  const repeatRef = useRef<number | null>(null);

  const stop = () => {
    if (repeatRef.current != null) {
      window.clearInterval(repeatRef.current);
      repeatRef.current = null;
    }
  };

  useEffect(() => stop, []);

  const hold = (delta: { theta?: number; radius?: number }) => {
    stop();
    const step = () => {
      const controls = controlsRef.current;
      if (controls) nudgeOrbit(controls, delta);
    };
    step();
    repeatRef.current = window.setInterval(step, 50);
  };

  return (
    <div className="touch-controls" aria-label="Touch camera controls">
      {BUTTONS.map((button) => (
        <button
          key={button.name}
          type="button"
          aria-label={button.name}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            hold(button.delta);
          }}
          onPointerUp={stop}
          onPointerCancel={stop}
          onPointerLeave={stop}
        >
          {button.label}
        </button>
      ))}
    </div>
  );
}

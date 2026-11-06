// Keyboard + touch controls. Exposes a move vector (x right, y forward) and look yaw.
export const input = { moveX: 0, moveY: 0, yaw: 0, enabled: false, update() {}, onInteract: null };
const keys = {};

export function setupControls(canvas) {
  addEventListener('keydown', e => { keys[e.code] = true; if ((e.code === 'KeyE' || e.code === 'Enter') && !e.repeat) input.onInteract?.(); });
  addEventListener('keyup', e => { keys[e.code] = false; });

  const stick = document.getElementById('stick');
  const knob = document.getElementById('knob');
  stick.hidden = !matchMedia('(pointer: coarse)').matches;

  // Joystick (bottom left)
  const stickVec = { x: 0, y: 0 };
  let stickId = null, cx = 0, cy = 0;
  const moveStick = e => {
    if (e.pointerId !== stickId) return;
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const max = 45, d = Math.hypot(dx, dy);
    if (d > max) { dx = dx / d * max; dy = dy / d * max; }
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    stickVec.x = dx / max; stickVec.y = -dy / max;
  };
  stick.addEventListener('pointerdown', e => {
    stickId = e.pointerId; stick.setPointerCapture(e.pointerId);
    const r = stick.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2;
    moveStick(e);
  });
  stick.addEventListener('pointermove', moveStick);
  const endStick = e => {
    if (e.pointerId !== stickId) return;
    stickId = null; stickVec.x = stickVec.y = 0; knob.style.transform = '';
  };
  stick.addEventListener('pointerup', endStick);
  stick.addEventListener('pointercancel', endStick);

  // Look: drag anywhere on the game view
  let lookId = null, lastX = 0;
  canvas.addEventListener('pointerdown', e => { lookId = e.pointerId; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    if (e.pointerId !== lookId) return;
    input.yaw -= (e.clientX - lastX) * 0.006; lastX = e.clientX;
  });
  const endLook = e => { if (e.pointerId === lookId) lookId = null; };
  canvas.addEventListener('pointerup', endLook);
  canvas.addEventListener('pointercancel', endLook);

  input.update = () => {
    let x = stickVec.x, y = stickVec.y;
    if (keys.KeyW || keys.ArrowUp) y += 1;
    if (keys.KeyS || keys.ArrowDown) y -= 1;
    if (keys.KeyD || keys.ArrowRight) x += 1;
    if (keys.KeyA || keys.ArrowLeft) x -= 1;
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    input.moveX = input.enabled ? x : 0;
    input.moveY = input.enabled ? y : 0;
  };
}

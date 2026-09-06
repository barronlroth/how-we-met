const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// A pointer owns its control until release, even when it leaves the hit area.
// Keeping this independent of the DOM lets us exercise simultaneous fingers.
export function createTouchState() {
  const pointers = new Map();
  let steering = null;
  const state = { steer: 0, brake: false, boost: false, fire: false, x: 0, y: 0 };
  function held(action) { for (const value of pointers.values()) if (value === action) return true; return false; }
  function refresh() {
    state.brake = !!steering?.braking || held('brake');
    state.boost = held('boost');
    state.fire = held('fire');
  }
  function move(id, x, y) {
    if (steering?.id !== id) return;
    state.x = clamp((x - steering.x) / steering.radius, -1, 1);
    state.y = clamp((y - steering.y) / steering.radius, -1, 1);
    state.steer = Math.sign(state.x) * Math.max(0, (Math.abs(state.x) - .1) / .9);
    // Hysteresis prevents brake flutter around the pull-down threshold.
    steering.braking = state.y > (steering.braking ? .28 : .5);
    refresh();
  }
  return {
    state,
    begin(id, action, pad) {
      if (pointers.has(id) || !['steer', 'brake', 'boost', 'fire'].includes(action)) return false;
      if (action === 'steer') {
        if (steering || !pad || !(pad.radius > 0)) return false;
        steering = { id, x: pad.x, y: pad.y, radius: pad.radius, braking: false };
      }
      pointers.set(id, action); refresh(); return true;
    },
    move,
    end(id) {
      pointers.delete(id);
      if (steering?.id === id) { steering = null; state.steer = state.x = state.y = 0; }
      refresh();
    },
    held,
    reset() {
      pointers.clear(); steering = null;
      Object.assign(state, { steer: 0, brake: false, boost: false, fire: false, x: 0, y: 0 });
    }
  };
}

export function drivingInput(keys, touch) {
  const keyboardSteer = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
  return {
    steer: keyboardSteer || touch.steer,
    brake: keys.has('KeyS') || keys.has('ArrowDown') || touch.brake,
    boost: keys.has('ShiftLeft') || keys.has('ShiftRight') || touch.boost,
    fire: keys.has('Space') || !!touch.fire
  };
}

export function bindTouchControls(root, { active, onFire }) {
  const input = createTouchState(), captures = new Map();
  const pad = root.querySelector('[data-control="steer"]');
  const buttons = [...root.querySelectorAll('button[data-control]')];
  function paint() {
    pad.style.setProperty('--stick-x', `${input.state.x * 34}px`);
    pad.style.setProperty('--stick-y', `${input.state.y * 26}px`);
    pad.classList.toggle('is-held', input.held('steer'));
    pad.classList.toggle('is-braking', input.state.brake);
    for (const button of buttons) {
      const held = input.held(button.dataset.control);
      button.classList.toggle('is-held', held);
    }
  }
  function release(event) {
    input.end(event.pointerId);
    const element = captures.get(event.pointerId);
    captures.delete(event.pointerId);
    if (element?.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
    paint();
  }
  for (const element of [pad, ...buttons]) {
    element.addEventListener('pointerdown', event => {
      if (!active() || (event.pointerType === 'mouse' && event.button !== 0)) return;
      const action = element.dataset.control, rect = element.getBoundingClientRect();
      const geometry = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, radius: Math.min(rect.width, rect.height) * .38 };
      if (!input.begin(event.pointerId, action, geometry)) return;
      event.preventDefault();
      element.setPointerCapture(event.pointerId); captures.set(event.pointerId, element);
      if (action === 'steer') input.move(event.pointerId, event.clientX, event.clientY);
      if (action === 'fire') onFire();
      paint();
    });
    element.addEventListener('pointermove', event => { input.move(event.pointerId, event.clientX, event.clientY); paint(); });
    element.addEventListener('lostpointercapture', release);
    element.addEventListener('contextmenu', event => event.preventDefault());
  }
  // Window listeners cover cancellation even if capture is lost or a node hides.
  root.ownerDocument.defaultView.addEventListener('pointerup', release);
  root.ownerDocument.defaultView.addEventListener('pointercancel', release);
  for (const button of buttons) {
    button.addEventListener('keydown', event => {
      if (!['Space', 'Enter'].includes(event.code)) return;
      event.preventDefault(); event.stopPropagation();
      if (!active() || event.repeat) return;
      const action = button.dataset.control;
      if (input.begin(`key-${action}`, action) && action === 'fire') onFire();
      paint();
    });
    button.addEventListener('keyup', event => {
      if (!['Space', 'Enter'].includes(event.code)) return;
      // Let the global release handler clear a key first pressed on the canvas
      // if focus moved onto this button while that key was still held.
      event.preventDefault();
      input.end(`key-${button.dataset.control}`); paint();
    });
    button.addEventListener('blur', () => { input.end(`key-${button.dataset.control}`); paint(); });
    // Assistive click activation of the water shot has no pointer sequence.
    button.addEventListener('click', event => {
      if (event.detail === 0 && active() && button.dataset.control === 'fire') onFire();
    });
  }
  return {
    state: input.state,
    reset() {
      input.reset();
      for (const [id, element] of captures) if (element.hasPointerCapture(id)) element.releasePointerCapture(id);
      captures.clear(); paint();
    }
  };
}

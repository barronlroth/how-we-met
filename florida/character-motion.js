// Transform-only animation of the authored articulation nodes. No skinning,
// geometry changes, allocations, or scene traversal in the frame update.
export function makeCharacterMotion(root) {
  const names = ['Barron', 'Nina', 'BarronHead', 'NinaHead', 'DrivingArm', 'PointingArm'];
  const nodes = names.map(name => {
    const node = root.getObjectByName(name);
    if (!node) throw new Error(`The airboat asset is missing ${name}.`);
    return {node, x: node.rotation.x, y: node.rotation.y, z: node.rotation.z, height: node.position.y, quaternion: node.quaternion.clone()};
  });
  let clock = 0, lean = 0, flight = 0, nearAge = 2, landAge = 2;
  const pose = (i, x = 0, y = 0, z = 0, height = 0) => {
    const base = nodes[i];
    base.node.rotation.set(base.x + x, base.y + y, base.z + z);
    base.node.position.y = base.height + height;
  };
  function reset() {
    clock = lean = flight = 0;
    nearAge = landAge = 2;
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].node.quaternion.copy(nodes[i].quaternion);
      nodes[i].node.position.y = nodes[i].height;
    }
  }
  function event(type) {
    if (type === 'near') nearAge = 0;
    if (type === 'land') landAge = 0;
  }
  function update(race, dt, reducedMotion = false) {
    // Frozen poses stay frozen while menus are overlaid on the race.
    if (race.status === 'paused') return;
    if (reducedMotion || race.status !== 'racing') { reset(); return; }
    dt = Math.max(0, Math.min(.065, dt));
    clock += dt; nearAge += dt; landAge += dt;
    const follow = 1 - Math.exp(-dt * 9);
    lean += (Math.max(-1, Math.min(1, race.turn)) - lean) * follow;
    flight += ((race.y > .12 ? 1 : 0) - flight) * follow;
    // A quick shoulder lift and glance toward Barron, then a measured release.
    const near = nearAge < .95 ? Math.sin(Math.PI * nearAge / .95) ** 2 : 0;
    // Brief landing compression, followed by a smaller, slower recovery nod.
    const impact = landAge < .55 ? Math.sin(Math.PI * landAge / .55) * Math.exp(-landAge * 5) : 0;
    const settle = landAge < .8 ? Math.sin(Math.PI * landAge / .8) ** 2 : 0;
    const brace = flight * (race.vy < 0 ? .09 : .045);
    const breath = Math.sin(clock * 1.8) * .005;
    pose(0, brace + impact * .11, 0, -lean * .085, -impact * .03);
    pose(1, brace + impact * .16, 0, -lean * .12 + near * .025, -impact * .04);
    pose(2, -brace * .4 + settle * .035, -lean * .06, lean * .025);
    pose(3, -brace * .6 + near * .035 + settle * .045, near * .24 - lean * .055, lean * .04 - near * .045);
    pose(4, -brace * .5 - impact * .05, 0, lean * .035);
    pose(5, -flight * .42 - near * .24 + impact * .12 + breath, near * .07, near * .06);
  }
  return {reset, event, update};
}

// Fictional race banter written for this game, at Barron's request.
// One turn for each friend per run; another set of jokes on the next replay.
export const FRIEND_LINES = Object.freeze({
 Miles: [
  'Miles would miss this turn and blame Apple Maps.',
  'Miles would call this “basically a straight shot.”',
  'Miles packed six outfits for a boat with two seats.',
  'Miles is still explaining how he’d take that corner.',
  'Miles knows a shortcut. That’s why we’re going this way.',
 ],
 Brauser: [
  'Brauser would negotiate the price of the free life jacket.',
  'Brauser saw that yacht and immediately said “business expense.”',
  'Brauser’s boat would have a dress code and no engine.',
  'Brauser would ask if the alligator knows the owner.',
  'Brauser has a guy for this. The guy is also on a floatie.',
 ],
 Josh: [
  'Josh made a spreadsheet for a boat day. We’re behind schedule.',
  'Josh would give that splash a three-star review.',
  'Josh brought a portable charger. For the alligator, apparently.',
  'Josh would pause this race to explain the optimal route.',
  'Josh said “one quick question.” There goes our dinner reservation.',
 ],
 Clark: [
  'Clark would point at that mansion and say “great bones.”',
  'Clark’s giving docking advice from a boat he can’t park.',
  'Clark would call this a networking event with more sunscreen.',
  'Clark says he can clear that ramp. Clark is on a paddleboard.',
  'Clark would salute the bridge. Honestly, I respect it.',
 ],
 Dewey: [
  'Dewey brought boat shoes. Forgot literally everything else.',
  'Dewey would lose a race to a stationary dock.',
  'Dewey’s emergency plan is “see what happens.”',
  'Dewey would wave at the alligator like they went to college.',
  'Dewey’s already at Fisheries. Somehow ordered for twelve.',
 ],
});

export const CHECKPOINT_LINES = [
 'Superyachts ahead. Big money, very little turning room.',
 'Into the mangroves! Follow the yellow shortcut markers.',
 'Party cove. Watch the crossing—those floaties have no brakes.',
 'There’s the bridge. Fisheries on the right. Dinner is the finish line!',
];

export function createNinaBanter(rotation = 0) {
 const friends = Object.keys(FRIEND_LINES);
 let cursor = 0, nextAt = 10;
 return {
  next({ status, elapsed, captionBusy = false }) {
   if (status !== 'racing' || captionBusy || elapsed < nextAt || cursor >= friends.length) return null;
   const friend = friends[cursor++], lines = FRIEND_LINES[friend];
   const text = lines[((rotation % lines.length) + lines.length) % lines.length];
   // Delays never build a queue: a collision can postpone a joke without
   // releasing several captions together when the route becomes quiet.
   nextAt = elapsed + 13;
   return { friend, text, duration: Math.max(4.2, text.length / 17) };
  },
 };
}

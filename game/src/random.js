// A small seeded random number generator (mulberry32): the same seed gives the
// same order of tickets and the same rush, which is what makes the screenshot
// scenes repeatable.

export function createRandom(seed) {
  let a = seed | 0;
  function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  // v6: the stream position, so a retried day can replay exactly the same
  // tickets instead of a different, possibly harder day.
  random.getState = () => a;
  random.setState = (s) => { a = s | 0; };
  random.reseed = (s) => { a = s | 0; };
  return random;
}

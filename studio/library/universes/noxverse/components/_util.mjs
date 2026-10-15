// Shared helpers for Noxverse components.
/** Frame of a timed prop: { sync|at } objects (fit-timing writes at), a number, or a fallback. */
export const when = (v, fallback = 0) => (typeof v === 'number' ? v : v?.at ?? fallback);

/**
 * Port: gives the current time. Use cases never call new Date() directly,
 * so tests can set the time (code expired after 5 min, 3 min to answer...).
 */
export abstract class Clock {
  abstract now(): Date;
}

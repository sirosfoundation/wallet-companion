// Firefox uses `browser.*` instead of `chrome.*`.
// Declare it as optionally present so `typeof browser !== 'undefined'` guards work correctly.
declare const browser: typeof chrome | undefined;

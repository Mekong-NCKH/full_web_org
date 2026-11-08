function getLogger() {
  return console;
}

export const logger = {
  info: (...params: any[]) => getLogger().log(...params),
  error: (...params: any[]) => getLogger().error(...params),
  warn: (...params: any[]) => getLogger().warn(...params),
  // debug: (...params: any[]) => getLogger().debug(...params),
  debug: () => {},
  log: (...params: any[]) => getLogger().log(...params),
};

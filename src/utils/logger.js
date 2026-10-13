function stamp() {
  return new Date().toISOString();
}

const logger = {
  info: (...args) => console.log(`[INFO ${stamp()}]`, ...args),
  warn: (...args) => console.warn(`[WARN ${stamp()}]`, ...args),
  error: (...args) => console.error(`[ERROR ${stamp()}]`, ...args)
};

module.exports = logger;

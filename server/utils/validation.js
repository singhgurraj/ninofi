function ensureUuid(id, label = 'id') {
  const str = typeof id === 'string' ? id : '';
  const ok = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(str);
  if (!ok) {
    const err = new Error(`${label} is invalid`);
    err.statusCode = 400;
    throw err;
  }
}

module.exports = { ensureUuid };

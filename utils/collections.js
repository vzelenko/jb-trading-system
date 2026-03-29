export function groupBy(items, keySelector) {
  const map = new Map();

  for (const item of items) {
    const key = keySelector(item);
    if (!map.has(key)) {
      map.set(key, []);
    }

    map.get(key).push(item);
  }

  return map;
}

export function indexBy(items, keySelector) {
  const map = new Map();

  for (const item of items) {
    map.set(keySelector(item), item);
  }

  return map;
}

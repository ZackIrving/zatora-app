export function getMigratedLocalStorageValue(currentKey, legacyKey, storage = localStorage) {
  const currentValue = storage.getItem(currentKey)

  if (currentValue !== null) return currentValue

  const legacyValue = storage.getItem(legacyKey)

  if (legacyValue !== null) {
    storage.setItem(currentKey, legacyValue)
  }

  return legacyValue
}

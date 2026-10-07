// IndexedDB 存档（无服务器），失败时回退到 localStorage
const DB_NAME = 'pixel-craft-brewery'
const STORE = 'saves'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function idbSet(key: string, value: unknown): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(value, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    try {
      localStorage.setItem(DB_NAME + ':' + key, JSON.stringify(value))
    } catch {
      /* ignore */
    }
  }
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  try {
    const db = await openDb()
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(key)
      req.onsuccess = () => resolve(req.result as T | undefined)
      req.onerror = () => reject(req.error)
    })
  } catch {
    try {
      const s = localStorage.getItem(DB_NAME + ':' + key)
      return s ? (JSON.parse(s) as T) : undefined
    } catch {
      return undefined
    }
  }
}

export async function idbDelete(key: string): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
  } catch {
    /* ignore */
  }
}

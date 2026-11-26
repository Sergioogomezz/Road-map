import { useSyncExternalStore } from 'react'
import { syncStatus } from '../data/syncStatus'

export function useSyncStatus() {
  return useSyncExternalStore(syncStatus.subscribe, syncStatus.getSnapshot)
}

import { useEffect, useRef, useState } from 'react'
import type { Attempt } from '../learning/progress'
import { exportProgress, importProgress, openProgress, readProgress, writeExamResult, writeProgress, type ExamRecord, type ImportSummary, type ProgressData } from '../storage/progress'

const empty: ProgressData = { attempts: [], visits: [], annotations: [], settings: [], exams: [] }

export function useProgress() {
  const [data, setData] = useState(empty)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const database = useRef<Promise<IDBDatabase> | null>(null)
  const connect = () => database.current ??= openProgress()
  const pending = useRef<Promise<void>>(Promise.resolve())

  function enqueue<T>(operation: (db: IDBDatabase) => Promise<T>): Promise<T> {
    const next = pending.current.then(() => connect()).then(operation)
    pending.current = next.then(() => {}, () => {})
    return next
  }

  useEffect(() => {
    let active = true
    void enqueue(readProgress).then((loaded) => {
      if (active) { setData(loaded); setReady(true) }
    }).catch(() => { if (active) setError('Progress storage is unavailable. Enable IndexedDB to save your work.') })
    return () => { active = false }
  }, [])

  async function save<K extends keyof ProgressData>(store: K, record: ProgressData[K][number]) {
    try {
      await enqueue(async (db) => {
        const saved = await writeProgress(db, store, record)
        setData((previous) => ({ ...previous, [store]: [...previous[store].filter((row) => row.id !== saved.id), saved] }))
      })
      setError('')
      return true
    } catch {
      setError('The latest change could not be saved on this device.')
      return false
    }
  }

  async function saveExamResult(exam: ExamRecord, attempts: readonly Attempt[]) {
    try {
      const saved = await enqueue(async (db) => {
        const result = await writeExamResult(db, exam, attempts)
        setData(await readProgress(db))
        return result
      })
      setError(saved ? '' : 'This exam already has a saved result on this device.')
    } catch {
      setError('The exam result could not be saved on this device.')
    }
  }

  async function restore(json: string): Promise<ImportSummary | null> {
    try {
      const summary = await enqueue(async (db) => {
        const result = await importProgress(db, json)
        setData(await readProgress(db))
        return result
      })
      setError('')
      return summary
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'The progress file could not be imported.')
      return null
    }
  }

  async function download() {
    try {
      const snapshot = await enqueue(readProgress)
      const url = URL.createObjectURL(new Blob([exportProgress(snapshot)], { type: 'application/json' }))
      const link = document.createElement('a')
      link.href = url
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      link.download = `theorylab-progress-${timestamp}.json`
      document.body.append(link)
      try {
        link.click()
      } finally {
        link.remove()
        setTimeout(() => URL.revokeObjectURL(url), 60_000)
      }
      setError('')
      return true
    } catch {
      setError('The progress backup could not be downloaded.')
      return false
    }
  }

  return { data, ready, error, save, saveExamResult, restore, download }
}

export type Progress = ReturnType<typeof useProgress>

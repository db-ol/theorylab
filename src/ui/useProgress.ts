import { useEffect, useRef, useState } from 'react'
import type { Attempt } from '../learning/progress'
import { exportProgress, importProgress, openProgress, readProgress, writeExamResult, writeProgress, type ExamRecord, type ProgressData } from '../storage/progress'

const empty: ProgressData = { attempts: [], visits: [], annotations: [], settings: [], exams: [] }

export function useProgress() {
  const [data, setData] = useState(empty)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const database = useRef<Promise<IDBDatabase> | null>(null)
  const connect = () => database.current ??= openProgress()

  useEffect(() => {
    let active = true
    void connect().then(readProgress).then((loaded) => {
      if (active) { setData(loaded); setReady(true) }
    }).catch(() => { if (active) setError('Progress storage is unavailable. Enable IndexedDB to save your work.') })
    return () => { active = false }
  }, [])

  async function save<K extends keyof ProgressData>(store: K, record: ProgressData[K][number]) {
    try {
      const db = await connect()
      await writeProgress(db, store, record)
      setData((previous) => ({ ...previous, [store]: [...previous[store].filter((row) => row.id !== record.id), record] }))
      setError('')
    } catch {
      setError('The latest change could not be saved on this device.')
    }
  }

  async function saveExamResult(exam: ExamRecord, attempts: readonly Attempt[]) {
    try {
      const db = await connect()
      await writeExamResult(db, exam, attempts)
      const ids = new Set(attempts.map((attempt) => attempt.id))
      setData((previous) => ({
        ...previous, exams: [...previous.exams.filter((item) => item.id !== exam.id), exam],
        attempts: [...previous.attempts.filter((attempt) => !ids.has(attempt.id)), ...attempts],
      }))
      setError('')
    } catch {
      setError('The exam result could not be saved on this device.')
    }
  }

  async function restore(json: string) {
    try {
      const db = await connect()
      await importProgress(db, json)
      setData(await readProgress(db))
      setError('')
      return true
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'The progress file could not be imported.')
      return false
    }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([exportProgress(data)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'theorylab-progress.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1_000)
  }

  return { data, ready, error, save, saveExamResult, restore, download }
}

export type Progress = ReturnType<typeof useProgress>

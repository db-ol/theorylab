import { describe, expect, test } from 'vitest'
import coverage from '../../SYLLABUS_COVERAGE.md?raw'
import { objectives, syllabusUrl } from './objectives'

const objectivePattern = /^\| [A-Z]{3}-[1-5]-/
const rows = coverage.split('\n')
  .filter(line => objectivePattern.test(line))
  .map(line => line.split('|').slice(1, -1).map(field => field.trim()))

describe('official syllabus coverage', () => {
  test('keeps each matrix objective and curriculum record in agreement', () => {
    expect(coverage).not.toMatch(/\n\n\| [A-Z]{3}-[1-5]-/)
    expect(new Set(rows.map(row => row[0])).size).toBe(rows.length)
    expect(new Set(objectives.map(objective => objective.id)).size).toBe(objectives.length)
    expect(rows.length).toBe(objectives.length)
    const rowById = new Map(rows.map(row => [row[0], row]))

    for (const objective of objectives) {
      const source = objective.source
      expect(source.url).toBe(syllabusUrl)
      expect(source.pages.length).toBeGreaterThan(0)
      expect(rowById.get(objective.id)).toEqual([
        objective.id, String(objective.grade), objective.domain, objective.title,
        objective.chineseTitle, objective.chineseExplanation, objective.prerequisites.join(', '),
        objective.terms.join(', '), objective.questionTypes.join(', '), objective.strategy,
        source.pages.join(', '), objective.status[0].toUpperCase() + objective.status.slice(1),
        objective.validation[0].toUpperCase() + objective.validation.slice(1),
      ])
    }
  })

  test('resolves prerequisites without cycles or references to later grades', () => {
    const byId = new Map(objectives.map(objective => [objective.id, objective]))
    const active = new Set<string>()
    const visited = new Set<string>()

    function visit(id: string) {
      if (visited.has(id)) return
      expect(active.has(id), `Prerequisite cycle at ${id}`).toBe(false)
      const objective = byId.get(id)
      if (!objective) throw new Error(`Missing curriculum objective ${id}`)
      active.add(id)
      for (const prerequisite of objective.prerequisites) {
        const required = byId.get(prerequisite)
        if (!required) throw new Error(`Missing prerequisite ${prerequisite} for ${id}`)
        expect(required.grade).toBeLessThanOrEqual(objective.grade)
        visit(prerequisite)
      }
      active.delete(id)
      visited.add(id)
    }

    for (const objective of objectives) visit(objective.id)
    expect(visited.size).toBe(objectives.length)
  })
})

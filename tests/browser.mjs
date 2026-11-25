import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'
import { chromium, webkit } from 'playwright'

const site = new URL('https://theorylab.test/theory/')
const dist = new URL('../dist/', import.meta.url)
const contentTypes = new Map([
  ['.html', 'text/html'], ['.js', 'application/javascript'], ['.css', 'text/css'], ['.svg', 'image/svg+xml'],
])
const browserType = process.env.THEORYLAB_BROWSER === 'webkit' ? webkit : chromium
const browser = await browserType.launch({ headless: true, ...(process.env.THEORYLAB_BROWSER === 'chrome' ? { channel: 'chrome' } : {}) })
const pageErrors = []

async function openPage(viewport) {
  const context = await browser.newContext({ viewport })
  await context.route('https://theorylab.test/**', async route => {
    const { pathname } = new URL(route.request().url())
    if (!pathname.startsWith(site.pathname)) {
      await route.fulfill({ status: 404, body: 'Not found' })
      return
    }
    const relative = pathname.slice(site.pathname.length) || 'index.html'
    try {
      const body = await readFile(new URL(relative, dist))
      await route.fulfill({ status: 200, body, contentType: contentTypes.get(extname(relative)) })
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
      await route.fulfill({ status: 404, body: 'Not found' })
    }
  })
  const page = await context.newPage()
  page.on('pageerror', error => pageErrors.push(error))
  await page.addInitScript(() => {
    const randomValues = crypto.getRandomValues.bind(crypto)
    Object.defineProperty(crypto, 'getRandomValues', {
      value(array) {
        if (array instanceof Uint32Array && array.length === 1) {
          array[0] = 1
          return array
        }
        return randomValues(array)
      },
    })
  })
  return page
}

async function go(page, hash) {
  await page.goto(new URL(hash, site).href)
  await page.locator('main h1').waitFor({ state: 'visible' })
}

async function intervalPractice(page) {
  await go(page, '#/lesson/INT-1-TONE')
  await page.getByRole('heading', { name: 'Interval explorer' }).waitFor()
  assert.ok(await page.locator('main [lang="zh-Hans"]').count() > 0)
  await page.getByRole('combobox', { name: 'Clef', exact: true }).selectOption('alto')
  await page.getByText('Alto clef', { exact: true }).waitFor()
  await page.getByRole('group', { name: 'Second note' }).getByLabel('Letter').selectOption('G')
  await page.getByText('3 semitones', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Mark lesson visited' }).click()
  await page.getByRole('button', { name: 'Lesson visited' }).waitFor()

  await go(page, '#/practice/INT-1-TONE')
  await page.getByRole('heading', { name: 'How many semitones separate these notes?' }).waitFor()
  assert.equal(await page.locator('main [lang="zh-Hans"]').count(), 0)
  await page.getByRole('button', { name: 'Vocabulary help' }).click()
  const answer = page.getByRole('radio', { name: /\b0$/u })
  await answer.focus()
  await page.keyboard.press('Space')
  assert.equal(await answer.isChecked(), true)
  await page.getByRole('button', { name: 'Check answer' }).click()
  await page.getByRole('heading', { name: 'Review this answer' }).waitFor()
  assert.ok(await page.locator('main [lang="zh-Hans"]').count() > 0)

  await go(page, '#/notebook')
  const mistake = page.locator('details.notebook-row').first()
  await mistake.locator('summary').click()
  await mistake.getByText('Used', { exact: true }).waitFor()
  await mistake.getByLabel('Likely cause').selectOption('Calculation error')
  await page.waitForFunction(() => document.querySelector('details.notebook-row[open] select')?.value === 'Calculation error')
  await page.reload()
  await page.locator('details.notebook-row').first().locator('summary').click()
  assert.equal(await page.getByLabel('Likely cause').inputValue(), 'Calculation error')
}

async function grade5Entry(page) {
  await go(page, '#/')
  await page.getByRole('heading', { level: 1, name: /Grade 5\s*Music Theory/u }).waitFor()
  const start = page.getByRole('link', { name: 'Start Grade 5', exact: true })
  assert.match(await start.getAttribute('href'), /^#\/lesson\/[A-Z]+-5-/u)
  await page.getByRole('link', { name: 'Review foundations', exact: true }).click()
  const scope = page.getByRole('navigation', { name: 'Study level' })
  const selected = scope.locator('a[aria-current="page"]')
  await selected.filter({ hasText: /^Grades 1 to 4$/u }).waitFor()
  const foundation = page.locator('main a[href="#/lesson/PIT-1-STAVE"]')
  const grade5 = page.locator('main a[href="#/lesson/INT-5-SIMPLE"]')
  await foundation.waitFor()
  assert.equal(await grade5.count(), 0)

  await scope.getByRole('link', { name: 'All grades', exact: true }).click()
  await selected.filter({ hasText: /^All grades$/u }).waitFor()
  await page.getByRole('button', { name: 'By grade', exact: true }).click()
  await page.getByRole('heading', { name: 'Grade 1', exact: true }).waitFor()
  await grade5.waitFor()

  await scope.getByRole('link', { name: 'Grade 5', exact: true }).click()
  await selected.filter({ hasText: /^Grade 5$/u }).waitFor()
  assert.equal(await foundation.count(), 0)
  await page.getByRole('searchbox', { name: 'Search objectives' }).fill('INT-5-SIMPLE')
  await grade5.waitFor()
  assert.equal(await page.locator('.objective-row').count(), 1)

  await go(page, '#/practice')
  await page.locator('main a[href="#/practice/INT-5-SIMPLE"]').waitFor()
  assert.equal(await page.locator('main a[href="#/practice/PIT-1-STAVE"]').count(), 0)
  await scope.getByRole('link', { name: 'Grades 1 to 4', exact: true }).click()
  await page.locator('main a[href="#/practice/PIT-1-STAVE"]').waitFor()
}

async function referenceVisuals(page) {
  await go(page, '#/lesson/ORN-4-SYMBOLS')
  await page.getByRole('heading', { name: 'Ornament examples' }).waitFor()
  await page.getByRole('combobox', { name: 'Ornament', exact: true }).selectOption({ label: 'lower mordent' })
  await page.getByRole('img', { name: 'Zigzag with vertical stroke' }).waitFor()
  await page.getByRole('img', { name: /treble clef staff, [A-G]\d, [A-G]\d, [A-G]\d/i }).waitFor()

  await go(page, '#/lesson/TER-2-ENDINGS')
  await page.getByRole('button', { name: 'Show second pass' }).click()
  await page.getByText('Second pass. Skip the first ending.', { exact: true }).waitFor()
}

async function visualLesson(page) {
  await go(page, '#/lesson/RHY-5-TUPLET')
  await page.getByRole('img', { name: /Ratio 5 to 4/ }).waitFor()
  await page.getByRole('slider', { name: 'Time position' }).focus()
  await page.keyboard.press('ArrowRight')
  await page.getByText('1/20 of a crotchet beat from the start').waitFor()
  await page.getByRole('button', { name: 'Sextuplet semiquavers' }).click()
  await page.getByText('1/6 of a crotchet beat', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Start knowledge check' }).click()
  const scores = page.locator('.score-options')
  await scores.getByRole('radio').first().check()
  assert.ok(await scores.getByRole('img').count() >= 3)
  await page.getByRole('button', { name: 'Check answer' }).click()
  await page.locator('.feedback [lang="zh-Hans"]').first().waitFor()
}

async function fullMock(page) {
  await go(page, '#/exam')
  await page.getByRole('button', { name: 'Start full mock' }).click()
  await page.getByRole('heading', { level: 1, name: 'Rhythm' }).waitFor()
  assert.equal(await page.getByRole('button', { name: /^Question \d+$/ }).count(), 75)
  assert.equal(await page.locator('[lang="zh-Hans"]').count(), 0)
  assert.equal(await page.getByRole('button', { name: 'Vocabulary help' }).count(), 0)
  await page.getByRole('button', { name: 'Flag', exact: true }).click()
  await page.getByRole('radio').first().check()
  await page.getByRole('button', { name: 'Question 5', exact: true }).click()
  await page.getByRole('spinbutton', { name: 'Your answer', exact: true }).fill('2')
  await page.getByRole('button', { name: 'Question 23', exact: true }).click()
  await page.getByRole('combobox', { name: 'Your answer', exact: true }).selectOption({ index: 1 })
  await page.getByRole('button', { name: 'Question 42', exact: true }).click()
  const palette = page.getByRole('group', { name: 'Noteheads' })
  await palette.getByRole('button', { name: 'Flat notehead', exact: true }).click()
  await page.getByText('No note placed', { exact: true }).waitFor()
  const target = page.locator('[data-pitch-target]')
  await target.scrollIntoViewIfNeeded()
  const location = await target.evaluate(rect => {
    const bounds = rect.getBBox()
    return new DOMPoint(bounds.x + bounds.width / 2, 87 - 4 * 6).matrixTransform(rect.getScreenCTM()).toJSON()
  })
  await page.mouse.click(location.x, location.y)
  await page.getByText('Line 3, flat', { exact: true }).waitFor()
  const sharp = palette.getByRole('button', { name: 'Double sharp notehead', exact: true })
  await sharp.dragTo(target)
  await page.getByRole('status').filter({ hasText: /double sharp/ }).waitFor()
  await page.getByRole('button', { name: 'Question 46', exact: true }).click()
  const matching = page.getByRole('group', { name: 'Melody for two cadences' })
  assert.equal(await matching.getByRole('combobox').count(), 5)
  await matching.getByRole('combobox', { name: 'Chord C', exact: true }).selectOption({ label: 'IV' })
  await page.getByRole('button', { name: 'Flag C', exact: true }).click()
  await page.getByRole('button', { name: 'Question 66', exact: true }).click()
  await page.getByRole('heading', { level: 1, name: 'Music in Context' }).waitFor()
  await page.getByText('Bar 4', { exact: true }).waitFor()
  await page.getByText('5 of 75 answered', { exact: true }).waitFor()
  await page.waitForFunction(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('theorylab-progress')
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const db = open.result
      const read = db.transaction('exams').objectStore('exams').getAll()
      read.onerror = () => { db.close(); reject(read.error) }
      read.onsuccess = () => {
        db.close()
        resolve(read.result.some(({ value }) => value.status === 'active' && value.flags.length === 2
          && Object.keys(value.answers).length === 5))
      }
    }
  }))
  await page.reload()
  await page.getByText('5 of 75 answered', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Question 48, flagged', exact: true }).click()
  assert.equal(await page.getByRole('combobox', { name: 'Chord C', exact: true }).locator('option:checked').textContent(), 'IV')
  assert.equal(await page.getByRole('button', { name: 'Question 1, flagged', exact: true }).count(), 1)
  await page.getByRole('button', { name: 'Question 5', exact: true }).click()
  assert.equal(await page.getByRole('spinbutton', { name: 'Your answer', exact: true }).inputValue(), '2')
  await page.getByRole('button', { name: 'Finish attempt' }).click()
  await page.getByRole('button', { name: 'Submit examination' }).click()
  await page.getByRole('heading', { level: 1, name: /\d+ \/ 75/u }).waitFor()
  await page.getByText('Below Pass · Submitted', { exact: true }).waitFor()
  await page.locator('details.exam-explanation').first().locator('summary').click()
  assert.ok(await page.locator('details.exam-explanation[open] [lang="zh-Hans"]').count() > 0)
  await page.getByRole('button', { name: 'Back to exams' }).click()
  await page.getByRole('heading', { name: 'Exam history' }).waitFor()
}

async function metreAndProgress(page) {
  await go(page, '#/lesson/MET-5-IRREGULAR')
  const signature = page.getByRole('group', { name: 'Time signature', exact: true })
  const family = page.getByRole('group', { name: 'Metre', exact: true })
  assert.equal(await signature.getByRole('radio', { name: '5/8', exact: true }).isChecked(), true)
  await signature.getByRole('radio', { name: '7/8', exact: true }).check()
  await page.getByRole('group', { name: 'Beat grouping' }).getByRole('radio', { name: '2 + 3 + 2', exact: true }).check()
  await page.getByRole('status').filter({ hasText: '2 + 3 + 2' }).waitFor()
  await family.getByRole('radio', { name: 'Compound', exact: true }).check()
  await signature.getByRole('radio', { name: '9/4', exact: true }).check()
  await page.getByRole('status').filter({ hasText: '9 crotchets in the bar' }).waitFor()

  await page.getByRole('button', { name: 'Mark lesson visited' }).click()
  for (const route of ['#/', '#/curriculum']) {
    await go(page, route)
    const studied = page.getByRole('progressbar', { name: 'Grade 5 lessons studied', exact: true })
    await page.locator('progress[aria-label="Grade 5 lessons studied"][value="1"]').waitFor()
    const total = Number(await studied.getAttribute('max'))
    assert.ok(total > 1)
    await page.locator('.progress-stat').filter({ has: studied }).getByText(`${Math.round(100 / total)}%`, { exact: true }).waitFor()
    assert.equal(await page.getByRole('progressbar', { name: 'Grade 5 objectives mastered', exact: true }).getAttribute('value'), '0')
  }
}

async function mobileAndTimer() {
  const page = await openPage({ width: 390, height: 840 })
  await metreAndProgress(page)
  await page.clock.install()
  await go(page, '#/lesson/INT-5-COMPOUND')
  const dimensions = await page.evaluate(() => ({
    window: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth,
  }))
  assert.ok(dimensions.page <= dimensions.window + 1, `Mobile document overflow: ${dimensions.page} px`)
  const navigation = page.getByRole('button', { name: 'Toggle navigation' })
  await navigation.focus()
  await page.keyboard.press('Enter')
  assert.equal(await navigation.getAttribute('aria-expanded'), 'true')
  const exam = page.getByRole('link', { name: 'Mock exam', exact: true })
  await exam.focus()
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Start timed practice' }).click()
  await page.getByRole('heading', { name: 'Intervals', level: 1 }).waitFor()
  await page.clock.fastForward(16 * 60_000 + 1_000)
  await page.getByText('Intervals section score · Time expired', { exact: true }).waitFor()
  await page.context().close()
}

try {
  const page = await openPage({ width: 1440, height: 1000 })
  await grade5Entry(page)
  await intervalPractice(page)
  await referenceVisuals(page)
  await visualLesson(page)
  await fullMock(page)
  await page.context().close()
  await mobileAndTimer()
  assert.deepEqual(pageErrors.map(error => error.message), [])
  process.stdout.write('Browser checks passed for Grade 5 navigation, interval practice, persistence, reference visuals, full mock and mobile timer.\n')
} finally {
  await browser.close()
}

import { describe, it, expect } from 'vitest'
import { defaultCardState, applyResult } from './srLogic'
import {
  wordKind,
  stepKeys,
  cardId,
  answerFor,
  formOptions,
  buildSteps,
  aggregateWordState,
  wordStateMap,
  itemsOfKind,
  wordResult,
  sessionSummary,
} from './wordFormsLogic'

const identity = (arr) => arr

const ga = {
  id: 'wf-vb-v070',
  forms: { infinitiv: 'gå', presens: 'går', preteritum: 'gick', supinum: 'gått' },
}
const helg = {
  id: 'wf-nn-v006',
  gender: 'en',
  forms: { sgIndef: 'helg', sgDef: 'helgen', plIndef: 'helger', plDef: 'helgerna' },
  askPlural: true,
}
const jobb = {
  id: 'wf-nn-v100',
  gender: 'ett',
  forms: { sgIndef: 'jobb', sgDef: 'jobbet', plIndef: 'jobb', plDef: 'jobben' },
  askPlural: true,
}
const sjukvard = {
  id: 'wf-nn-v200',
  gender: 'en',
  forms: { sgIndef: 'sjukvård', sgDef: 'sjukvården', plIndef: null, plDef: null },
  askPlural: false,
}

describe('wordKind / stepKeys', () => {
  it('asks three tenses for a verb', () => {
    expect(wordKind(ga)).toBe('verb')
    expect(stepKeys(ga)).toEqual(['presens', 'preteritum', 'supinum'])
  })

  it('asks gender, definite and both plurals for a countable noun', () => {
    expect(wordKind(helg)).toBe('noun')
    expect(stepKeys(helg)).toEqual(['gender', 'sgDef', 'plIndef', 'plDef'])
  })

  it('skips the plural steps when askPlural is false', () => {
    expect(stepKeys(sjukvard)).toEqual(['gender', 'sgDef'])
  })
})

describe('cardId / answerFor', () => {
  it('builds one card id per step', () => {
    expect(cardId(ga, 'preteritum')).toBe('wf-vb-v070:preteritum')
  })

  it('answers the gender step with the article and others with the form', () => {
    expect(answerFor(helg, 'gender')).toBe('en')
    expect(answerFor(helg, 'plIndef')).toBe('helger')
  })
})

describe('formOptions', () => {
  it('offers the verb\'s own four forms', () => {
    expect(formOptions(ga, 'preteritum', identity)).toEqual(['gå', 'går', 'gick', 'gått'])
  })

  it('always offers en / ett for the gender step', () => {
    expect(formOptions(helg, 'gender', identity)).toEqual(['en', 'ett'])
  })

  it('de-duplicates identical forms (jobb is singular and plural)', () => {
    expect(formOptions(jobb, 'plIndef', identity)).toEqual(['jobb', 'jobbet', 'jobben'])
  })

  it('leaves out missing plural forms', () => {
    expect(formOptions(sjukvard, 'sgDef', identity)).toEqual(['sjukvård', 'sjukvården'])
  })

  it('uses the injected shuffle', () => {
    expect(formOptions(ga, 'presens', (a) => [...a].reverse())).toEqual(['gått', 'gick', 'går', 'gå'])
  })
})

describe('buildSteps', () => {
  it('always includes the correct answer among the options', () => {
    for (const item of [ga, helg, jobb, sjukvard]) {
      for (const step of buildSteps(item)) {
        expect(step.options, `${step.cardId}`).toContain(step.answer)
      }
    }
  })

  it('returns the full step list with card ids', () => {
    expect(buildSteps(sjukvard, identity)).toEqual([
      { key: 'gender', cardId: 'wf-nn-v200:gender', answer: 'en', options: ['en', 'ett'] },
      {
        key: 'sgDef',
        cardId: 'wf-nn-v200:sgDef',
        answer: 'sjukvården',
        options: ['sjukvård', 'sjukvården'],
      },
    ])
  })
})

describe('aggregateWordState', () => {
  const stateFrom = (map) => (id) => map[id] ?? defaultCardState()

  it('is the default state for a word never practised', () => {
    const agg = aggregateWordState(stateFrom({}), ga)
    expect(agg).toMatchObject({ weight: defaultCardState().weight, lastSeen: 0, learned: false })
  })

  it('takes the hardest step\'s weight and the latest lastSeen', () => {
    const map = {
      'wf-vb-v070:presens': { ...defaultCardState(), weight: 1, lastSeen: 100 },
      'wf-vb-v070:supinum': { ...defaultCardState(), weight: 8, lastSeen: 300 },
    }
    const agg = aggregateWordState(stateFrom(map), ga)
    expect(agg.weight).toBe(8)
    expect(agg.lastSeen).toBe(300)
  })

  it('is learned only when every step is learned', () => {
    let learnedCard = defaultCardState()
    for (let i = 0; i < 6; i++) learnedCard = applyResult(learnedCard, true, 1000)
    expect(learnedCard.learned).toBe(true)

    const twoLearned = {
      'wf-vb-v070:presens': learnedCard,
      'wf-vb-v070:preteritum': learnedCard,
    }
    expect(aggregateWordState(stateFrom(twoLearned), ga).learned).toBe(false)
    const allLearned = { ...twoLearned, 'wf-vb-v070:supinum': learnedCard }
    expect(aggregateWordState(stateFrom(allLearned), ga).learned).toBe(true)
  })

  it('sums the correct / wrong counts', () => {
    const map = {
      'wf-vb-v070:presens': { ...defaultCardState(), timesCorrect: 2, timesWrong: 1 },
      'wf-vb-v070:supinum': { ...defaultCardState(), timesCorrect: 1, timesWrong: 3 },
    }
    expect(aggregateWordState(stateFrom(map), ga)).toMatchObject({ timesCorrect: 3, timesWrong: 4 })
  })
})

describe('wordStateMap', () => {
  it('maps every item id to its aggregated state', () => {
    const map = wordStateMap(() => defaultCardState(), [ga, helg])
    expect(Object.keys(map)).toEqual(['wf-vb-v070', 'wf-nn-v006'])
  })
})

describe('itemsOfKind', () => {
  const wordForms = { source: {}, verbs: [ga], nouns: [helg, jobb] }

  it('returns verbs, nouns, or both', () => {
    expect(itemsOfKind(wordForms, 'verbs')).toEqual([ga])
    expect(itemsOfKind(wordForms, 'nouns')).toEqual([helg, jobb])
    expect(itemsOfKind(wordForms, 'all')).toEqual([ga, helg, jobb])
  })

  it('returns nothing for a language without word forms', () => {
    expect(itemsOfKind(null, 'all')).toEqual([])
  })
})

describe('wordResult', () => {
  const steps = buildSteps(ga, identity) // presens går, preteritum gick, supinum gått

  it('counts the steps answered right', () => {
    expect(wordResult(steps, ['går', 'gått', 'gått'])).toEqual({ correct: 2, total: 3 })
  })

  it('treats unanswered steps as wrong', () => {
    expect(wordResult(steps, ['går'])).toEqual({ correct: 1, total: 3 })
  })
})

describe('sessionSummary', () => {
  it('splits words into fully right, partly right and all wrong', () => {
    const summary = sessionSummary([
      { correct: 3, total: 3 },
      { correct: 2, total: 2 },
      { correct: 1, total: 4 },
      { correct: 0, total: 3 },
    ])
    expect(summary).toEqual({
      words: 4,
      perfect: 2,
      partial: 1,
      missed: 1,
      correctSteps: 6,
      totalSteps: 12,
    })
  })

  it('is all zeros for an empty session', () => {
    expect(sessionSummary([])).toMatchObject({ words: 0, perfect: 0, correctSteps: 0, totalSteps: 0 })
  })
})

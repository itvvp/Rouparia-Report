import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseGarments, groupByModel } from './parse.ts'

const H = [[null, 'Chip Code'], []]
test('merges the 2-row pairs and groups by model', () => {
  const rows = [...H,
    [null, 'C1', 'CAMISA - S', '4073', 'CAMISA', null, null, null, 'Soiled', null, 'Loaner', 45860.5],
    [null, null, 'S', null, null, null, null, null, null, 'ToRetire'],
    [null, 'C2', 'MOT - 3', '4170', 'MOT', null, '0079', null, 'Soiled', null, 'Personal', null],
    [null, null, '3', null, null, null, 'José', null, null, 'Available'],
  ]
  const g = parseGarments(rows)
  assert.equal(g.length, 2)
  assert.deepEqual([g[0].size, g[0].availability, g[0].status], ['S', 'ToRetire', 'Soiled'])
  assert.deepEqual([g[1].employeeCode, g[1].employeeName], ['0079', 'José'])
  assert.equal(g[0].date?.getUTCFullYear(), 2025)
  assert.equal(groupByModel(g).length, 2)
  assert.throws(() => parseGarments([[null, 'x']]))
})

import { splitEmployee, parseDelivery, mergeDelivery } from './parse.ts'
test('splits "name - number" in all the formats seen in the file', () => {
  const t = (raw: string, name: string, code: string) => assert.deepEqual(splitEmployee(raw), { name, code })
  t('Abdallah Attoui - 39387', 'Abdallah Attoui', '39387')
  t('Abdallah Boukhalfa 39565', 'Abdallah Boukhalfa', '39565')
  t('Jaspreet Singh (26852)', 'Jaspreet Singh', '26852')
  t('Cristina Jose Kalengue - 38442 - 1', 'Cristina Jose Kalengue', '38442')
  t('Aissa   Barka----28694', 'Aissa Barka', '28694')
  t('Adama Cande ', 'Adama Cande', '')
  t('Judelita Marques de matos 1a', 'Judelita Marques de matos 1a', '')
})
test('delivery rows are merged into garments by chip', () => {
  const ds = parseDelivery([['Nome Colaborador'], ['Ana - 123', 'POLO - S', 'C1', 46253, 'Cat'], ['Bia', 'X', 'ZZ', null, '']])
  const g = parseGarments([...H, [null, 'C1', 'POLO - S', '1', 'POLO'], [null, null, 'S'], [null, 'C2', 'POLO - S', '1', 'POLO'], [null, null, 'S']])
  const r = mergeDelivery(g, ds)
  assert.equal(r.garments[0].delivery?.employeeCode, '123')
  assert.equal(r.garments[1].delivery, undefined)
  assert.equal(r.unmatched, 1)
  assert.throws(() => parseDelivery([['Chip Code']]))
})

import { total } from './parse.ts'
test('total = Soiled + In Use + Loaded + New - ToRetire + por entregar', () => {
  const g = (status: string, availability: string, delivery?: object) => ({ status, availability, delivery }) as never
  // 5 counted statuses (the ToRetire one is Soiled), 1 other status ignored, 1 ToRetire (-1), 1 por entregar (+1)
  assert.equal(total([g('Soiled', ''), g('In Use', ''), g('Loaded', ''), g('New', ''), g('Other', ''), g('Soiled', 'ToRetire'), g('Other', '', {})]), 5 - 1 + 1)
})

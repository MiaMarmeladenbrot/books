type Row = Record<string, unknown>

const NOT_ONE_ROW = {
  message: 'JSON object requested, multiple (or no) rows returned',
  code: 'PGRST116',
  details: null,
  hint: null,
}

function settle(picked: Row[], patch: Row | null, noneIsFine: boolean) {
  if (picked.length > 1) return { data: null, error: NOT_ONE_ROW }
  const row = picked[0]
  if (!row) return noneIsFine ? { data: null, error: null } : { data: null, error: NOT_ONE_ROW }
  if (patch) Object.assign(row, patch)
  return { data: { ...row }, error: null }
}

function chain(rows: Row[], patch: Row | null) {
  let picked = rows

  const self = {
    eq(column: string, value: unknown) {
      picked = picked.filter((row) => row[column] === value)
      return self
    },
    select() {
      return self
    },
    maybeSingle: () => Promise.resolve(settle(picked, patch, true)),
    single: () => Promise.resolve(settle(picked, patch, false)),
  }

  return self
}

export function fakeDb(tables: Record<string, Row[]>) {
  return {
    from(table: string) {
      const rows = tables[table] ?? []
      return {
        select: () => chain(rows, null),
        update: (patch: Row) => chain(rows, patch),
      }
    },
  }
}

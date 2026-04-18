import * as XLSX from 'xlsx'

const FT_TO_M = 0.3048

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

// Column indices in the sheet (0-based, row 1 = headers, row 2+ = data)
// Aircraft | Length (ft) | Wingspan (ft) | Tail Height (ft) | Fuselage Width (ft) |
// Wing Type | Wing Root Height (ft) | Wing Thickness (ft) | Floor Area | Fits?
const COL = {
  name:           0,
  length:         1,
  wingspan:       2,
  tailHeight:     3,
  fuselageWidth:  4,
  wingType:       5,
  wingRootHeight: 6,
  wingThickness:  7,
  elevatorSpan:   10,
}

export async function loadFleetFromExcel(url = '/fleet.xlsx') {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch fleet file: ${res.status}`)
  const buffer = await res.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })

  // Use first sheet
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })

  // Skip header row (row 0), parse rest
  const specs = []
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const name = row[COL.name]
    if (!name || typeof name !== 'string') continue

    const length         = Number(row[COL.length])
    const wingspan       = Number(row[COL.wingspan])
    const tailHeight     = Number(row[COL.tailHeight])
    const fuselageWidth  = Number(row[COL.fuselageWidth])
    const wingType       = String(row[COL.wingType] ?? 'low').trim()
    const wingRootHeight = Number(row[COL.wingRootHeight] ?? 0)
    const wingThickness  = Number(row[COL.wingThickness] ?? 0.8)
    const elevatorSpan   = Number(row[COL.elevatorSpan]  ?? 0)

    if (!length || !wingspan || !tailHeight) continue // skip incomplete rows

    specs.push({
      id:             slugify(name),
      name:           name.trim(),
      // All stored in meters internally
      length:         length         * FT_TO_M,
      wingspan:       wingspan       * FT_TO_M,
      tailHeight:     tailHeight     * FT_TO_M,
      fuselageWidth:  fuselageWidth  * FT_TO_M,
      wingType,
      wingRootHeight: wingRootHeight * FT_TO_M,
      wingThickness:  wingThickness  * FT_TO_M,
      elevatorSpan:   elevatorSpan   * FT_TO_M,
    })
  }

  if (specs.length === 0) throw new Error('No valid aircraft found in fleet file')
  return specs
}

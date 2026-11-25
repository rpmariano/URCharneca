/**
 * Gerador mínimo de PDF (A4, uma tabela com cabeçalho repetido em cada página), sem dependências.
 * Usa as fontes Helvetica do próprio leitor de PDF com codificação WinAnsi, que cobre o português.
 */

export interface PdfColumn {
  label: string
  /** Largura em pontos; a soma deve caber em `PDF_CONTENT_WIDTH` */
  width: number
  align?: 'left' | 'right'
}

export interface PdfTable {
  title: string
  /** Linhas de contexto por baixo do título */
  subtitle: string[]
  columns: PdfColumn[]
  rows: string[][]
  /** Nota no rodapé de todas as páginas */
  footer: string
}

const PAGE_W = 595.28
const PAGE_H = 841.89
const MARGIN = 40
export const PDF_CONTENT_WIDTH = PAGE_W - MARGIN * 2

// Caracteres fora do Latin-1 que o WinAnsi também tem
const WIN_ANSI_EXTRA: Record<string, number> = {
  '€': 0x80,
  '…': 0x85,
  '‘': 0x91,
  '’': 0x92,
  '“': 0x93,
  '”': 0x94,
  '•': 0x95,
  '–': 0x96,
  '—': 0x97,
}

/** Converte texto para bytes WinAnsi (um caráter por byte). O que a fonte não tem perde o acento ou vira "?". */
export function toWinAnsi(text: string): string {
  let out = ''
  for (const ch of text.normalize('NFC').replace(/\s+/g, ' ')) {
    const code = ch.codePointAt(0)!
    if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff)) out += ch
    else if (ch in WIN_ANSI_EXTRA) out += String.fromCharCode(WIN_ANSI_EXTRA[ch])
    else {
      const plain = ch.normalize('NFD').replace(/[̀-ͯ]/g, '')
      out += /^[\x20-\x7e]+$/.test(plain) ? plain : '?'
    }
  }
  return out
}

/** Largura aproximada em Helvetica (por excesso): chega para decidir onde partir linhas. */
function textWidth(text: string, size: number): number {
  let em = 0
  for (const ch of text) {
    if (/[0-9]/.test(ch)) em += 0.556
    else if (/[ .,:;'!|ijlIíì]/.test(ch)) em += 0.29
    else if (/[mwMW@]/.test(ch)) em += 0.9
    else if (ch !== ch.toLowerCase()) em += 0.72
    else em += 0.56
  }
  return em * size
}

/** Parte um texto em linhas que cabem na largura; uma palavra maior do que a linha é cortada. */
export function wrapText(text: string, width: number, size: number): string[] {
  const lines: string[] = []
  let line = ''
  for (let word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word
    if (textWidth(candidate, size) <= width) {
      line = candidate
      continue
    }
    if (line) lines.push(line)
    while (textWidth(word, size) > width && word.length > 1) {
      let cut = word.length - 1
      while (cut > 1 && textWidth(word.slice(0, cut), size) > width) cut--
      lines.push(word.slice(0, cut))
      word = word.slice(cut)
    }
    line = word
  }
  if (line) lines.push(line)
  return lines.length ? lines : ['']
}

const n = (v: number) => v.toFixed(2)
const escapePdf = (s: string) => s.replace(/[\\()]/g, '\\$&')

export function buildTablePdf({ title, subtitle, columns, rows, footer }: PdfTable): Uint8Array<ArrayBuffer> {
  const pages: string[][] = []
  let ops: string[] = []
  let y = 0 // distância ao topo da página

  const text = (value: string, x: number, top: number, size: number, bold = false) =>
    ops.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${n(x)} ${n(PAGE_H - top)} Td (${escapePdf(toWinAnsi(value))}) Tj ET`)
  const rule = (top: number, weight: number) =>
    ops.push(`${weight} w ${n(MARGIN)} ${n(PAGE_H - top)} m ${n(PAGE_W - MARGIN)} ${n(PAGE_H - top)} l S`)
  /** Escreve uma célula alinhada à esquerda ou à direita da sua coluna */
  const cell = (value: string, col: number, top: number, size: number, bold = false) => {
    const c = columns[col]
    const left = MARGIN + columns.slice(0, col).reduce((s, x) => s + x.width, 0)
    // Alinhamento à direita: a medida é exata para algarismos e aproximada para letras
    const x = c.align === 'right' ? left + c.width - textWidth(value, size) - 4 : left + 4
    text(value, x, top, size, bold)
  }

  const tableHead = () => {
    columns.forEach((c, i) => cell(c.label, i, y + 12, 9.5, true))
    y += 19
    rule(y, 1.2)
  }
  const newPage = () => {
    ops = []
    pages.push(ops)
    y = MARGIN
  }

  newPage()
  for (const line of wrapText(title, PDF_CONTENT_WIDTH, 17)) {
    text(line, MARGIN, y + 15, 17, true)
    y += 21
  }
  for (const entry of subtitle) {
    for (const line of wrapText(entry, PDF_CONTENT_WIDTH, 10.5)) {
      text(line, MARGIN, y + 11, 10.5)
      y += 14.5
    }
  }
  y += 14
  tableHead()

  const bottom = PAGE_H - MARGIN - 30
  for (const row of rows) {
    const cells = columns.map((c, i) => wrapText(row[i] ?? '', c.width - 8, 11))
    const height = Math.max(26, 12 + Math.max(...cells.map((l) => l.length)) * 14)
    if (y + height > bottom) {
      newPage()
      tableHead()
    }
    cells.forEach((lines, i) => lines.forEach((line, j) => cell(line, i, y + 17 + j * 14, 11)))
    y += height
    rule(y, 0.4)
  }

  pages.forEach((page, i) => {
    ops = page
    text(footer, MARGIN, PAGE_H - MARGIN, 8.5)
    const label = `Página ${i + 1} de ${pages.length}`
    text(label, PAGE_W - MARGIN - textWidth(label, 8.5), PAGE_H - MARGIN, 8.5)
  })

  // Objetos: 1 catálogo, 2 árvore de páginas, 3 e 4 fontes; depois (página, conteúdo) por cada página
  const font = (name: string) => `<< /Type /Font /Subtype /Type1 /BaseFont /${name} /Encoding /WinAnsiEncoding >>`
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pages.map((_, i) => `${5 + i * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`,
    font('Helvetica'),
    font('Helvetica-Bold'),
  ]
  pages.forEach((page, i) => {
    const stream = page.join('\n')
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + i * 2} 0 R >>`,
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
    )
  })

  // O comentário binário na 2.ª linha avisa que o ficheiro não é só texto ASCII
  let pdf = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n'
  const offsets = objects.map((body, i) => {
    const offset = pdf.length
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`
    return offset
  })
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  pdf += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`

  return Uint8Array.from(pdf, (ch) => ch.charCodeAt(0))
}

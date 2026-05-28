export const PASTEL_COLORS = [
  '#0000B8',
  '#39FF14',
  '#CB410B',
  '#FF0080',
]

export const REMINDER_TYPE_LABELS = {
  vacuna: 'Vacuna',
  desparasitacion: 'Desparasitación',
  medicamento: 'Medicamento',
  visita: 'Visita',
  otro: 'Otro',
}

export function getPastelColor(index) {
  return PASTEL_COLORS[index % PASTEL_COLORS.length]
}
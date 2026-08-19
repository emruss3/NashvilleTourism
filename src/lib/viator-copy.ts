/** Convert Viator HTML-ish supplier copy into plain paragraphs. */
export function viatorParagraphs(text: string): string[] {
  const withBreaks = text
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/\s*p\s*>/gi, '\n\n')
    .replace(/<\s*p[^>]*>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'");

  return withBreaks
    .split(/\n{2,}/)
    .map((block) => block.replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

export function confirmationLabel(type?: string): string | undefined {
  switch (type) {
    case 'INSTANT':
      return 'Instant confirmation';
    case 'MANUAL':
      return 'Confirmation from the operator';
    case 'INSTANT_THEN_MANUAL':
      return 'Instant confirmation, then operator follow-up';
    default:
      return undefined;
  }
}

export function admissionLabel(value?: string): string | undefined {
  if (value === 'YES') return 'Admission included';
  if (value === 'NO') return 'Admission not included';
  return undefined;
}

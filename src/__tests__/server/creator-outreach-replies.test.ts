import {
  classifyReply,
  normalizeEmail,
  receivedText,
  summarizeReply,
  suggestedReplyFor,
} from '@/lib/email/creatorReplyContent';

describe('creator outreach reply processing', () => {
  it('normalizes display-name addresses without inventing invalid emails', () => {
    expect(normalizeEmail('Creator <Creator@Example.com>')).toBe('creator@example.com');
    expect(normalizeEmail('not-an-email')).toBeNull();
  });

  it.each([
    ['Sí, me interesa. Hablemos.', 'interested'],
    ['¿Me puedes pasar presupuesto y detalles?', 'needs_info'],
    ['No gracias, ahora no nos interesa.', 'not_interested'],
    ['Por favor, darme de baja y no contactar.', 'unsubscribed'],
    ['Gracias por escribir.', 'replied'],
  ] as const)('classifies %s as %s', (body, expected) => {
    expect(classifyReply(body)).toBe(expected);
  });

  it('never suggests another send after a rejection or opt-out', () => {
    expect(suggestedReplyFor('not_interested')).toBeNull();
    expect(suggestedReplyFor('unsubscribed')).toBeNull();
    expect(suggestedReplyFor('interested')).toContain('Gracias');
  });

  it('removes quoted history from the sheet summary but keeps the CRM body', () => {
    const body = 'Me interesa.\n\n> Mensaje anterior que no debe ir al resumen';
    expect(summarizeReply(body)).toBe('Me interesa.');
    expect(receivedText(body, null)).toContain('Mensaje anterior');
  });

  it('falls back to safe plain text for HTML-only replies', () => {
    expect(receivedText(null, '<p>Hola &amp; gracias</p><script>bad()</script>')).toBe('Hola &amp; gracias');
  });

  it('never reintroduces encoded markup from HTML-only replies', () => {
    const html = '<div>&lt;script&gt;visible&lt;/script&gt;</div><script type="text/javascript">alert(1)</script>';
    expect(receivedText(null, html)).toBe('&lt;script&gt;visible&lt;/script&gt;');
  });

  it('drops script blocks with whitespace in their closing tag', () => {
    expect(receivedText(null, '<p>Antes</p><script>bad()</script ><p>Después</p>')).toBe('Antes\n\nDespués');
  });
});

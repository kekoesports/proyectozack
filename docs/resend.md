---
summary: 'Resend Node SDK — client setup, emails.send() API, error handling, use in Next.js API routes.'
read_when:
  - Implementing the contact form email sending
  - Working with src/lib/email.ts
---

# Resend SDK Reference

## Install

```bash
npm install resend
```

## Environment Variable

```bash
RESEND_API_KEY=re_xxxxxxxxxxxx
```

## Client Instantiation

```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)
```

Instantiate at module level (outside request handler) for reuse.

## `resend.emails.send()` — Full Signature

```typescript
const { data, error } = await resend.emails.send({
  from: 'SocialPro <noreply@socialpro.es>',   // must be verified domain in prod
  to: 'marketing@socialpro.es',                // string | string[] (max 50)
  subject: 'New contact form submission',
  html: '<p>Message body</p>',                 // at least one of html/text/react required
  text: 'Message body',                        // plain text fallback
  // react: <EmailTemplate {...props} />,       // React Email component (Node.js only)
  cc: 'cc@example.com',                        // optional
  bcc: 'bcc@example.com',                      // optional
  replyTo: 'sender@example.com',               // optional — use submitter's email
  // scheduledAt: '2024-01-01T00:00:00Z',      // optional ISO 8601
  // headers: { 'X-Custom': 'value' },         // optional
  // tags: [{ name: 'source', value: 'contact-form' }], // optional metadata
})
```

**Returns:** `{ data: { id: string } | null, error: { message: string, name: string } | null }`

## Error Handling

```typescript
// Do NOT use try/catch for SDK-level errors — check the error object
const { data, error } = await resend.emails.send({ ... })

if (error) {
  console.error('[Resend error]', error.message)
  // Don't throw — log and continue; submission is already saved to DB
  return
}

console.log('[Resend] Email sent:', data?.id)
```

## Usage in Next.js API Route

```typescript
// src/lib/email.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

interface ContactEmailData {
  name: string
  email: string
  type: string
  company?: string
  message: string
}

export async function sendContactNotification(data: ContactEmailData): Promise<void> {
  const { error } = await resend.emails.send({
    from: 'SocialPro <noreply@socialpro.es>',
    to: 'marketing@socialpro.es',
    replyTo: data.email,
    subject: `New contact: ${data.name} (${data.type})`,
    html: `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${data.name}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Type:</strong> ${data.type}</p>
      ${data.company ? `<p><strong>Company:</strong> ${data.company}</p>` : ''}
      <p><strong>Message:</strong></p>
      <p>${data.message.replace(/\n/g, '<br>')}</p>
    `,
  })

  if (error) {
    console.error('[sendContactNotification] Resend error:', error)
    // Don't re-throw — caller handles gracefully
  }
}
```

```typescript
// src/app/api/contact/route.ts
import { sendContactNotification } from '@/lib/email'

// After DB insert:
await sendContactNotification({ name, email, type, company, message })
// If it throws/fails: still return 200 (submission saved)
```

## Key Constraints

- **Verified domain:** `onboarding@resend.dev` is test-only. In production, use a verified domain (e.g. `noreply@socialpro.es`).
- **Rate limit:** 5 req/s per team.
- **camelCase params:** `replyTo`, `scheduledAt` — not snake_case.
- **Test addresses:** `delivered@resend.dev`, `bounced@resend.dev`.

## Webhook de entregabilidad

El endpoint de producción es `POST https://socialpro.es/api/webhooks/resend`.
Solo procesa eventos cuya firma Svix valida el SDK oficial; si falta
`RESEND_WEBHOOK_SECRET`, responde 503 y no persiste nada.

En Resend Dashboard → Webhooks:

1. Crear el endpoint con esa URL.
2. Suscribir `email.delivered`, `email.delivery_delayed`, `email.complained`,
   `email.bounced`, `email.failed` y `email.suppressed`.
3. Guardar el signing secret como `RESEND_WEBHOOK_SECRET` en el entorno de la
   aplicación. Nunca copiarlo a una variable `NEXT_PUBLIC_*`.
4. Aplicar la migración `0155_email_delivery_observability` antes de activar
   el webhook.

El consumidor usa `svix-id` como clave idempotente. Las entregas repetidas se
aceptan con 200 sin repetir efectos, y el orden de llegada no puede retirar una
supresión ya creada. Solo las quejas, los rebotes permanentes y las supresiones
del proveedor bloquean envíos posteriores de newsletter. Los rebotes
transitorios quedan como evento para diagnóstico.

Por privacidad, la base guarda únicamente el id de evento, id de email, tipo,
fecha y —cuando hay que impedir futuros envíos— la dirección normalizada. No
guarda asunto, cuerpo, cabeceras, IP ni payload completo.

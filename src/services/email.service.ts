//src/services/email.service.ts

export async function enviarCorreo(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    throw new Error('Falta la variable de entorno RESEND_API_KEY')
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Sabor y Gestion ',
      to: [to],
      subject,
      html
    })
  })

  if (!response.ok) {
    const err = await response
      .json()
      .catch(() => ({ message: 'No se pudo parsear el error de Resend' }))
    console.error('Error Resend API:', err)
    throw new Error('No se pudo enviar el correo a través de Resend')
  }
}

export class EmailService {
  async enviarEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      await enviarCorreo(to, subject, html)
    } catch (error) {
      console.error('Error enviando correo:', error)
      throw new Error('No se pudo enviar el email')
    }
  }

  generarTemplateVerificacion(codigo: string, nombreCompleto: string): string {
    return `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <h2>Verifica tu acceso al sistema</h2>
        <p>Hola ${nombreCompleto},</p>
        <p>Tu código de seguridad es:</p>
        <h1 style="color: #2563eb; letter-spacing: 5px;">${codigo}</h1>
        <p>Expira en 15 minutos.</p>
      </div>
    `
  }
}

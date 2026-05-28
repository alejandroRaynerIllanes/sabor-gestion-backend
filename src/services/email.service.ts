//src/services/email.service.ts

export async function enviarCorreo(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY
  const senderEmail = process.env.EMAIL_USER

  if (!apiKey) {
    throw new Error('Falta la variable de entorno BREVO_API_KEY')
  }

  if (!senderEmail) {
    throw new Error('Falta la variable de entorno EMAIL_USER')
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender: {
        name: 'Sabor & Gestión',
        email: senderEmail
      },
      to: [{ email: to }],
      subject,
      htmlContent: html
    })
  })

  if (!response.ok) {
    const errorBody = await response
      .json()
      .catch(() => ({ message: 'No se pudo parsear el error de Brevo' }))
    console.error('Error Brevo SMTP API:', errorBody)
    throw new Error('No se pudo enviar el correo a través de Brevo')
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

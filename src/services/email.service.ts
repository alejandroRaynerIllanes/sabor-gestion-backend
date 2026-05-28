//src/services/email.service.ts
import nodemailer from 'nodemailer'

let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    const user = process.env.EMAIL_USER
    const pass = (process.env.EMAIL_PASS || '').replace(/[\s"]/g, '')

    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // true para port 465
      auth: {
        user,
        pass
      },
      tls: {
        // No fallar en certificados inválidos en servidores de Render
        rejectUnauthorized: false
      }
    })
  }

  return transporter
}

export async function enviarCorreo(to: string, subject: string, html: string): Promise<void> {
  const t = getTransporter()

  await t.sendMail({
    from: `"Sabor & Gestión" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html
  })
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

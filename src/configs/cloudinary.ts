import type { Request } from 'express'
import { v2 as cloudinary } from 'cloudinary'
import multer from 'multer'
import dotenv from 'dotenv'

dotenv.config()

interface UploadedFile {
  originalname: string
  mimetype: string
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req: Request, file: UploadedFile, cb: multer.FileFilterCallback) => {
    console.log('Multer revisando archivo:', file.originalname, 'Tipo:', file.mimetype)

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']

    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`Formato no permitido: ${file.mimetype}`))
    }
  }
})

export const uploadToCloudinary = (
  buffer: Buffer,
  filename: string
): Promise<{ url: string; publicId: string }> => {
  return new Promise((resolve, reject) => {
    const nombreSinExtension = filename.replace(/\.[a-zA-Z0-9]+$/, '')
    const nombreLimpio = nombreSinExtension.replace(/[^a-zA-Z0-9]/g, '_')

    cloudinary.uploader
      .upload_stream(
        {
          folder: 'sabor-gestion/platos',
          public_id: `plato_${Date.now()}_${nombreLimpio}`,
          transformation: [{ width: 800, height: 600, crop: 'limit' }]
        },
        (
          error: Error | undefined,
          result: { secure_url: string; public_id: string } | undefined
        ) => {
          if (error || !result) {
            reject(error ?? new Error('No se recibió respuesta de Cloudinary'))
            return
          }

          resolve({ url: result.secure_url, publicId: result.public_id })
        }
      )
      .end(buffer)
  })
}

export { cloudinary }

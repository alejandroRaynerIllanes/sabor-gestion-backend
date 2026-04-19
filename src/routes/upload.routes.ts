import { Router } from 'express'
import type { NextFunction, Request, Response } from 'express'
import { upload, uploadToCloudinary } from '../configs/cloudinary.js'
import { deleteImage } from '../controllers/upload.controller.js'

const router = Router()

router.post(
  '/',
  (req: Request, res: Response, next: NextFunction) => {
    upload.single('imagen')(req, res, (err?: unknown) => {
      if (err) {
        console.error('Error en multer:', err)
        const message = err instanceof Error ? err.message : 'Error al procesar la imagen'
        res.status(400).json({ message })
        return
      }

      const requestWithFile = req as Request & { file?: Express.Multer.File }

      console.log('req.file:', requestWithFile.file)
      console.log('req.body:', req.body)
      next()
    })
  },
  async (req: Request, res: Response) => {
    try {
      const requestWithFile = req as Request & { file?: Express.Multer.File }

      if (!requestWithFile.file) {
        res.status(400).json({ message: 'No se recibió ninguna imagen' })
        return
      }

      const { url, publicId } = await uploadToCloudinary(
        requestWithFile.file.buffer,
        requestWithFile.file.originalname
      )
      res.status(200).json({ message: 'Imagen subida correctamente', url, publicId })
    } catch (error) {
      res.status(500).json({ message: 'Error al subir imagen', error })
    }
  }
)

router.delete('/', deleteImage)

export default router

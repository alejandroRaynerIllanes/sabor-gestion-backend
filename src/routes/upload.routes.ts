import { Router } from 'express'
import type { Request, Response } from 'express'
import { upload, uploadToCloudinary } from '../configs/cloudinary.js'
import { deleteImage } from '../controllers/upload.controller.js'

const router = Router()

router.post(
  '/',
  (req: Request, res: Response, next) => {
    upload.single('imagen')(req, res, (err) => {
      if (err) {
        console.error('❌ Error en multer:', err)
        res.status(400).json({ message: err.message })
        return
      }
      console.log('📁 req.file:', req.file)
      console.log('📋 req.body:', req.body)
      next()
    })
  },
  async (req: Request & { file?: Express.Multer.File }, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ message: 'No se recibió ninguna imagen' })
        return
      }
      const { url, publicId } = await uploadToCloudinary(req.file.buffer, req.file.originalname)
      res.status(200).json({ message: 'Imagen subida correctamente', url, publicId })
    } catch (error) {
      res.status(500).json({ message: 'Error al subir imagen', error })
    }
  }
)

router.delete('/', deleteImage)

export default router

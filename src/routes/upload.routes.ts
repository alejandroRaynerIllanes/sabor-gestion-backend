import { Router } from 'express'
import type { Request, Response } from 'express'
import { upload } from '../configs/cloudinary.js'
import { deleteImage } from '../controllers/upload.controller.js'

const router = Router()

// POST /api/upload — sube una imagen y devuelve la URL
router.post(
  '/',
  upload.single('imagen'),
  (req: Request & { file?: Express.Multer.File }, res: Response) => {
    if (!req.file) {
      res.status(400).json({ message: 'No se recibió ninguna imagen' })
      return
    }
    res.status(200).json({
      message: 'Imagen subida correctamente',
      url: (req.file as any).path,
      publicId: (req.file as any).filename
    })
  }
)

// DELETE /api/upload — elimina una imagen por publicId
router.delete('/', deleteImage)

export default router

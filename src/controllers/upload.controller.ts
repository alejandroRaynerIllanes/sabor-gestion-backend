import { Request, Response } from 'express'
import { cloudinary } from '../configs/cloudinary.js'

export const deleteImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { publicId } = req.body
    if (!publicId) {
      res.status(400).json({ message: 'Se requiere el publicId de la imagen' })
      return
    }
    await cloudinary.uploader.destroy(publicId)
    res.status(200).json({ message: 'Imagen eliminada correctamente' })
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar la imagen', error })
  }
}

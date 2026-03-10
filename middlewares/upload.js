import multer from 'multer'
import cloudinary from '../cloudinary/cloudinary.js'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import dotenv from 'dotenv'

dotenv.config()

// 設定 Multer 儲存引擎
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'tea_ecommerce', // 在雲端建立一個資料夾放圖片
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'], // 限制圖片格式
    // 手動指定 public_id (選填，但有助於管理)
    public_id: (req, file) => `${Date.now()}-${file.originalname.split('.')[0]}`,
  },
})

const upload = multer({ storage })

export default upload

import { Router } from 'express'
import upload from '../middlewares/upload.js'
import { StatusCodes } from 'http-status-codes'
import * as auth from '../middlewares/auth.js'
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/product.js'

const router = Router()

// 1. 取得產品清單 (使用 optionalToken)
router.get('/', auth.optionalToken, getProducts)

// 2. 獲取單一商品詳情
router.get('/:id', auth.optionalToken, getProductById)

/**
 * 3. 管理員操作 (需 Token 且為 Admin)
 */

// 新增商品
router.post(
  '/',
  auth.token,
  auth.admin,
  (req, res, next) => {
    upload.single('image')(req, res, (err) => {
      // 如果有錯誤，回傳錯誤回應並停止
      if (err) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json({ success: false, message: '圖片上傳失敗', error: err.message })
      }
      // 上傳成功，必須執行 next() 才會進入 createProduct
      next()
    })
  },
  createProduct,
)

// 修改商品 (PATCH)
router.patch(
  '/:id',
  auth.token,
  auth.admin,
  (req, res, next) => {
    upload.single('image')(req, res, (err) => {
      // 如果有錯誤，回傳錯誤回應並停止
      if (err) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json({ success: false, message: '圖片修改失敗', error: err.message })
      }
      // 上傳成功，進入 updateProduct
      next()
    })
  },
  updateProduct,
)

// 刪除商品 (DELETE)
router.delete('/:id', auth.token, auth.admin, deleteProduct)

export default router

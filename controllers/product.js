import product from '../models/product.js'
import { StatusCodes } from 'http-status-codes'
import cloudinary from '../cloudinary/cloudinary.js' // 確保路徑正確

/**
 * 輔助函數：從 Cloudinary URL 提取 Public ID
 * 範例：.../upload/v12345/tea_ecommerce/abc.jpg -> tea_ecommerce/abc
 */
const getPublicIdFromUrl = (url) => {
  try {
    if (!url || !url.includes('cloudinary')) return null
    const parts = url.split('/')
    const fileNameWithExtension = parts.pop() // abc.jpg
    const folder = parts.pop() // tea_ecommerce 或 v12345

    // 如果 folder 是版本號 (v開頭的數字)，再往上抓一層才是真正的資料夾
    const finalFolder = folder.startsWith('v') ? parts.pop() : folder
    const publicId = `${finalFolder}/${fileNameWithExtension.split('.')[0]}`

    // console.log('🔍 解析出的 Public ID:', publicId)
    return publicId
  } catch (error) {
    // console.error('解析 Public ID 失敗:', error)
    return null
  }
}

// 取得產品 (區分管理員與一般用戶)
export const getProducts = async (req, res) => {
  try {
    // 新增一個判斷：前端是否有帶 query 參數 ?admin=true
    const isModeAdmin = req.query.admin === 'true'

    // 驗證身分是否真的是管理員
    const isAdmin = req.user && (req.user.role === 'admin' || req.user.role === 1)

    // 核心邏輯：
    // 只有「身分是管理員」且「明確要求管理模式 (isModeAdmin)」時，才查詢全部 {}
    // 否則（包含管理員在逛前台時），一律只給 { isAvailable: true }
    const query = isAdmin && isModeAdmin ? {} : { isAvailable: true }

    const products = await product.find(query)
    res.status(StatusCodes.OK).json({ success: true, data: products })
  } catch (error) {
    // console.error('後端 getProducts 報錯:', error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: '伺服器錯誤' })
  }
}

// 獲取單一商品詳情
export const getProductById = async (req, res) => {
  try {
    const result = await product.findById(req.params.id)
    if (!result)
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: '找不到該商品' })

    // 額外保護：如果商品已下架且不是管理員，不允許查看
    const isAdmin = req.user && (req.user.role === 'admin' || req.user.role === 1)
    if (!result.isAvailable && !isAdmin) {
      return res.status(StatusCodes.FORBIDDEN).json({ success: false, message: '該商品已下架' })
    }

    res.json({ success: true, data: result })
  } catch (error) {
    res
      .status(StatusCodes.BAD_REQUEST)
      .json({ success: false, message: 'ID 格式錯誤', error: error.message })
  }
}

// 新增產品
export const createProduct = async (req, res) => {
  try {
    const productData = {
      ...req.body,
      price: Number(req.body.price),
      stock: Number(req.body.stock),
      isAvailable: req.body.isAvailable === 'true' || req.body.isAvailable === true,
      image: req.file ? req.file.path : 'https://placehold.co/600x400?text=No+Image',
    }
    const result = await product.create(productData)
    res.status(StatusCodes.CREATED).json({ success: true, data: result })
  } catch (error) {
    res
      .status(StatusCodes.BAD_REQUEST)
      .json({ success: false, message: '新增失敗', error: error.message })
  }
}

// 編輯商品 (包含圖片更新邏輯)
export const updateProduct = async (req, res) => {
  try {
    const oldProduct = await product.findById(req.params.id)
    if (!oldProduct)
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: '找不到商品' })

    const updateData = { ...req.body }

    // 處理圖片更換：如果有新上傳圖片，刪除舊圖
    if (req.file) {
      const oldPublicId = getPublicIdFromUrl(oldProduct.image)
      if (oldPublicId) {
        await cloudinary.uploader
          .destroy(oldPublicId)
          .catch((err) => console.log('雲端舊圖刪除失敗:', err))
      }
      updateData.image = req.file.path // 存入 Cloudinary 新路徑
    } else {
      // 沒傳新圖就移除 image 欄位，避免被 req.body 裡的舊字串覆蓋
      delete updateData.image
    }

    // 強制轉型確保資料型態正確
    if (updateData.price !== undefined) updateData.price = Number(updateData.price)
    if (updateData.stock !== undefined) updateData.stock = Number(updateData.stock)
    if (updateData.isAvailable !== undefined) {
      updateData.isAvailable = updateData.isAvailable === 'true' || updateData.isAvailable === true
    }

    const result = await product.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })

    res.status(StatusCodes.OK).json({ success: true, data: result })
  } catch (error) {
    console.error('更新商品報錯:', error)
    res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: '修改失敗' })
  }
}

// 刪除產品 (包含圖片同步刪除)
export const deleteProduct = async (req, res) => {
  try {
    // 一次性執行刪除並取得舊資料
    const result = await product.findByIdAndDelete(req.params.id)

    if (!result)
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: '找不到該商品' })

    // 同步刪除雲端圖片
    const publicId = getPublicIdFromUrl(result.image)
    if (publicId) {
      await cloudinary.uploader
        .destroy(publicId)
        .catch((err) => console.log('雲端圖片刪除失敗:', err))
    }

    res.status(StatusCodes.OK).json({ success: true, message: '商品與雲端圖片已成功刪除' })
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: '刪除失敗', error: error.message })
  }
}

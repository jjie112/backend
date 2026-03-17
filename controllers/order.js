import orders from '../models/order.js'
import users from '../models/user.js'
import { StatusCodes } from 'http-status-codes'
import products from '../models/product.js'
import mongoose from 'mongoose'

// [使用者] 建立訂單 (包含扣庫存邏輯)
export const createOrder = async (req, res) => {
  try {
    console.log('--- 結帳流程開始 ---')

    // 1. 抓取使用者，確認購物車
    const user = await users.findById(req.user._id).populate('cart.p_id')
    console.log('當前購物車項目數量:', user.cart.length)

    if (!user || user.cart.length === 0) {
      console.log('錯誤: 購物車為空')
      throw new Error('EMPTY_CART')
    }

    let totalPrice = 0
    const cartItems = []

    // 2. 遍歷購物車，逐一扣庫存
    for (const item of user.cart) {
      console.log(
        `正在處理商品: ${item.p_id.name}, 購買數量: ${item.quantity}, 目前庫存: ${item.p_id.stock}`,
      )

      // 💡 關鍵檢查：執行扣除動作
      const updatedProduct = await products.findOneAndUpdate(
        {
          _id: item.p_id._id,
          stock: { $gte: item.quantity },
        },
        {
          $inc: { stock: -item.quantity },
        },
        { new: true }, // 返回更新後的資料
      )

      if (!updatedProduct) {
        console.log(`失敗: 商品 ${item.p_id.name} 庫存不足或 ID 錯誤`)
        throw new Error(`STOCK_INSUFFICIENT_${item.p_id.name}`)
      }

      console.log(`成功: 商品 ${item.p_id.name} 扣除後剩餘庫存: ${updatedProduct.stock}`)

      totalPrice += item.p_id.price * item.quantity
      cartItems.push({ p_id: item.p_id._id, quantity: item.quantity })
    }

    // 3. 建立訂單
    const newOrder = await orders.create({
      u_id: req.user._id,
      cart: cartItems,
      totalPrice,
    })
    console.log('訂單建立成功，ID:', newOrder._id)

    // 4. 清空購物車
    user.cart = []
    await user.save()
    console.log('使用者購物車已清空')

    res.status(StatusCodes.OK).json({ success: true, message: '訂單建立成功' })
    console.log('--- 結帳流程結束 ---')
  } catch (error) {
    console.error('結帳過程發生錯誤:', error.message)
    if (error.message === 'EMPTY_CART') {
      res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: '購物車是空的' })
    } else if (error.message.startsWith('STOCK_INSUFFICIENT')) {
      const productName = error.message.replace('STOCK_INSUFFICIENT_', '')
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: `【${productName}】庫存不足` })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: '伺服器錯誤' })
    }
  }
}

// 使用者取得自己的訂單列表
export const getOrders = async (req, res) => {
  try {
    // 取得該使用者的訂單，並把商品詳細資料撈出來 (populate)
    const result = await orders
      .find({ u_id: req.user._id })
      .populate('cart.p_id')
      .sort({ createdAt: -1 })
    res.status(StatusCodes.OK).json({ success: true, data: result })
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: '伺服器錯誤' })
  }
}

// [使用者] 更新訂單狀態 (取消訂單需歸還庫存)
export const updateOrderStatus = async (req, res) => {
  const session = await mongoose.startSession()
  try {
    session.startTransaction()

    // 1. 找出該筆訂單（需為待處理狀態 0）
    const order = await orders
      .findOne({
        _id: req.params.id,
        u_id: req.user._id,
        status: 0,
      })
      .session(session)

    if (!order) throw new Error('NOT_FOUND_OR_UNMODIFIABLE')

    // 2. 歸還庫存邏輯
    for (const item of order.cart) {
      await products.findByIdAndUpdate(
        item.p_id,
        { $inc: { stock: item.quantity } }, // 💡 補回庫存
        { session },
      )
    }

    // 3. 更新訂單狀態為已取消 (2)
    order.status = 2
    await order.save({ session })

    await session.commitTransaction()
    res.status(StatusCodes.OK).json({ success: true, message: '訂單已成功取消' })
  } catch (error) {
    await session.abortTransaction()
    res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: '取消訂單失敗' })
  } finally {
    session.endSession()
  }
}

// 刪除訂單 (只能刪除自己的訂單，且狀態必須是已取消(2))
export const deleteOrder = async (req, res) => {
  try {
    // 安全檢查：除了 ID 對，還必須確保該訂單屬於當前使用者，且狀態必須是已取消(2)
    const order = await orders.findOne({ _id: req.params.id, u_id: req.user._id })

    if (!order) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: '找不到訂單' })
    }

    if (order.status !== 2) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: '只有已取消的訂單可以刪除' })
    }

    await orders.findByIdAndDelete(req.params.id)
    res.status(StatusCodes.OK).json({ success: true, message: '' })
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: '伺服器錯誤' })
  }
}

// 管理者取得所有訂單
export const getAllOrders = async (req, res) => {
  try {
    // 使用 .populate('u_id', 'account email') 顯示是哪個會員買的
    const result = await orders
      .find()
      .populate('u_id', 'account email')
      .populate('cart.p_id')
      .sort({ createdAt: -1 })
    res.status(StatusCodes.OK).json({ success: true, data: result })
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: '伺服器錯誤' })
  }
}

// [管理者] 更新狀態 (管理者手動取消也需考慮還庫存)
export const adminUpdateOrder = async (req, res) => {
  const session = await mongoose.startSession()
  try {
    session.startTransaction()

    const order = await orders.findById(req.params.id).session(session)
    if (!order) throw new Error('NOT_FOUND')

    const newStatus = parseInt(req.body.status)

    // 邏輯：如果管理員把訂單從 0 (待處理) 改為 2 (已取消)，則還庫存
    if (order.status === 0 && newStatus === 2) {
      for (const item of order.cart) {
        await products.findByIdAndUpdate(item.p_id, { $inc: { stock: item.quantity } }, { session })
      }
    }
    // 反向邏輯：如果管理員把 2 (已取消) 改回 0 (待處理)，則需重新扣庫存 (視需求而定)

    order.status = newStatus
    await order.save({ session })

    await session.commitTransaction()
    res.status(StatusCodes.OK).json({ success: true, message: '更新成功' })
  } catch (error) {
    await session.abortTransaction()
    res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: '更新失敗' })
  } finally {
    session.endSession()
  }
}

// 管理者刪除訂單 (只能刪除已取消的訂單)
export const adminDeleteOrder = async (req, res) => {
  try {
    // 1. 找訂單
    const order = await orders.findById(req.params.id)
    if (!order)
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: '找不到訂單' })

    // 2. 檢查狀態是否為已取消
    if (order.status !== 2) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: '請先將訂單標記為已取消，才能刪除' })
    }

    // 3. 執行刪除
    await orders.findByIdAndDelete(req.params.id)
    res.status(StatusCodes.OK).json({ success: true, message: '' })
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: '伺服器錯誤' })
  }
}

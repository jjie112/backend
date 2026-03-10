import orders from '../models/order.js'
import users from '../models/user.js'
import { StatusCodes } from 'http-status-codes'

// 使用者建立訂單 (從購物車結帳)
export const createOrder = async (req, res) => {
  try {
    // 1. 檢查購物車是否有東西
    // 假設你在 auth 攔截器已經把使用者資料存入 req.user 並 populate 了 cart.p_id
    const user = await users.findById(req.user._id).populate('cart.p_id')
    if (user.cart.length === 0) throw new Error('EMPTY_CART')

    // 2. 計算總金額（避免前端傳入錯誤金額，後端必須重算）
    const totalPrice = user.cart.reduce((sum, item) => {
      // 加入安全檢查：如果商品不存在，跳過或視為 0 元
      const price = item.p_id ? item.p_id.price : 0
      return sum + price * item.quantity
    }, 0)

    // 3. 建立訂單
    await orders.create({
      u_id: req.user._id,
      cart: user.cart,
      totalPrice,
    })

    // 4. 清空購物車
    user.cart = []
    await user.save()

    res.status(StatusCodes.OK).json({ success: true, message: '' })
  } catch (error) {
    if (error.message === 'EMPTY_CART') {
      res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: '購物車是空的' })
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

// 使用者更新訂單狀態 (只能取消自己的訂單，且狀態必須是待處理(0))
export const updateOrderStatus = async (req, res) => {
  try {
    // 只能取消自己的訂單，且狀態為 0 (待處理) 時才允許取消
    const result = await orders.findOneAndUpdate(
      { _id: req.params.id, u_id: req.user._id, status: 0 },
      // 接把要更新的 status 寫死為 2，防止使用者傳入其他狀態
      // { status: req.body.status },
      { status: 2 }, // 直接改為取消，避免前端傳入錯誤狀態
      { new: true, runValidators: true },
    )

    if (!result) throw new Error('NOT_FOUND')
    res.status(StatusCodes.OK).json({ success: true, message: '' })
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: '更新失敗或訂單不存在' })
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

// 管理者更新訂單狀態 (可取消、可完成)
export const adminUpdateOrder = async (req, res) => {
  try {
    // 管理者修改不需要檢查 u_id，只要訂單 ID 對即可
    const result = await orders.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true },
    )
    if (!result) throw new Error('NOT_FOUND')
    res.status(StatusCodes.OK).json({ success: true, message: '' })
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: '更新失敗' })
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

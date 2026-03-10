import { Schema, model, ObjectId } from 'mongoose'

// 購物車模型
const cartSchema = new Schema({
  p_id: {
    type: ObjectId,
    ref: 'products', // 關聯商品模型
    required: [true, '訂單商品 ID 必填'],
  },
  quantity: {
    type: Number,
    required: [true, '訂單商品數量必填'],
  },
})

// 訂單模型
const orderSchema = new Schema(
  {
    u_id: {
      type: ObjectId,
      ref: 'users',
      required: [true, '訂單使用者 ID 必填'],
    },
    cart: {
      type: [cartSchema],
      validate: {
        validator(value) {
          return value.length > 0
        },
        message: '訂單購物車不能為空',
      },
    },
    totalPrice: {
      type: Number,
      required: [true, '訂單總金額必填'],
    },
    status: {
      type: Number,
      default: 0, // 0: 待處理, 1: 已完成, 2: 已取消
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { versionKey: false },
)

export default model('orders', orderSchema)

import { Schema, model } from 'mongoose'

const productSchema = new Schema(
  {
    // 商品名稱
    // 欄位名稱
    name: {
      // 資料型態
      type: String,
      required: [true, '請輸入商品名稱'],
      minlength: [1, '商品名稱最少 1 個字'],
      maxlength: [100, '商品名稱最多 100 個字'],
      trim: true,
    },
    // 描述
    description: {
      type: String,
      required: [true, '請輸入商品描述'],
      minlength: [1, '商品描述最少 1 個字'],
      maxlength: [1000, '商品描述最多 1000 個字'],
      trim: true,
    },
    // 價格
    price: {
      type: Number,
      required: [true, '請輸入商品價格'],
      min: [0, '商品價格不能小於 0 元'],
    },
    // 分類
    category: {
      type: String,
      required: [true, '請選擇商品分類'],
      enum: {
        values: ['綠茶', '白茶', '黃茶', '青茶(烏龍茶)', '紅茶', '黑茶(普洱茶)'],
        message: '商品類別無效',
      },
    },
    // 圖片
    image: {
      type: String,
      required: [true, '請上傳商品圖片'],
    },
    // 產地
    origin: {
      type: String,
      required: [true, '請輸入商品產地'],
      minlength: [2, '商品產地最少 2 個字'],
      maxlength: [100, '商品產地最多 100 個字'],
      trim: true,
    },
    // 庫存
    stock: {
      type: Number,
      required: [true, '請輸入商品庫存量'],
      min: [0, '商品庫存量不能小於 0'],
    },
    // 商品是否上架
    isAvailable: {
      type: Boolean,
      default: true,
      required: [true, '請設定商品是否上架'],
    },
  },
  {
    timestamps: true, // 自動幫你加上 createdAt 和 updatedAt 欄位
    versionKey: false, // 隱藏 MongoDB 預設的 __v 欄位
  },
)

// 建立 Model
// model('資料表名稱', Schema)； //* model('資料表名稱', 宣告變數)
// 資料表名稱必須為複數，結尾加 s
export default model('products', productSchema)

const mongoose = require('mongoose');
require('dotenv').config();

// Tạo 2 connection độc lập theo nguyên tắc Least Privilege
const readConnection = mongoose.createConnection(process.env.MONGO_URI_READ);
const writeConnection = mongoose.createConnection(process.env.MONGO_URI_WRITE);

readConnection.on('connected', () => console.log('✓ Read DB Connected (Least Privilege: Read Only)'));
readConnection.on('error', (err) => console.error('✗ Lỗi Read DB:', err.message));

writeConnection.on('connected', () => console.log('✓ Write DB Connected (Least Privilege: Write/Admin)'));
writeConnection.on('error', (err) => console.error('✗ Lỗi Write DB:', err.message));

// Schema Sách
const bookSchema = new mongoose.Schema({
  bookCode: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  basePrice: { type: Number, required: true },
  vat: { type: Number, required: true },
  finalPrice: { type: Number, required: true }
}, { timestamps: true });

// Compile Model riêng biệt cho từng luồng kết nối
const BookReadModel = readConnection.model('Book', bookSchema);
const BookWriteModel = writeConnection.model('Book', bookSchema);

module.exports = {
  readConnection,
  writeConnection,
  BookReadModel,
  BookWriteModel
};
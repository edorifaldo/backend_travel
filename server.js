require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const path = require('path');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'public')));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/images');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); 
    }
});
const upload = multer({ storage: storage });

const port = process.env.PORT || 3000; 

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect(err => {
    if (err) { console.error('Error connecting to database:', err); return; }
    console.log('Successfully connected to the database: travel_db');
});

// Rute GET
app.get('/api/paket-wisata', (req, res) => {
    const sqlQuery = "SELECT * FROM paket_wisata ORDER BY created_at DESC"; 
    db.query(sqlQuery, (err, results) => { if (err) return res.status(500).json({ error: 'Gagal mengambil data' }); res.json(results); });
});
app.get('/api/paket-wisata/:id', (req, res) => {
    const idPaket = parseInt(req.params.id, 10);
    if (isNaN(idPaket)) return res.status(400).json({ message: 'ID Paket tidak valid.' });
    const sqlQuery = "SELECT * FROM paket_wisata WHERE id = ?";
    db.query(sqlQuery, [idPaket], (err, results) => { if (err) return res.status(500).json({ error: 'Gagal mengambil data' }); if (results.length > 0) res.json(results[0]); else res.status(404).json({ message: 'Paket tidak ditemukan.' }); });
});

// Rute POST dengan multi-upload
app.post('/api/paket-wisata/tambah', upload.fields([
    { name: 'gambar', maxCount: 1 },
    { name: 'galeri_gambar', maxCount: 10 }
]), (req, res) => {
    let galeriFileNames = [];
    if (req.files && req.files['galeri_gambar']) {
        galeriFileNames = req.files['galeri_gambar'].map(file => file.filename);
    }
    const dataBaru = { 
        nama: req.body.nama, 
        tujuan: req.body.tujuan, 
        harga: req.body.harga,
        deskripsi: req.body.deskripsi,
        gambar_url: (req.files && req.files['gambar']) ? req.files['gambar'][0].filename : null,
        itinerary: req.body.itinerary,
        galeri_gambar: JSON.stringify(galeriFileNames)
    };
    const sqlQuery = 'INSERT INTO paket_wisata SET ?';
    db.query(sqlQuery, dataBaru, (err, results) => {
        if (err) { console.error(err); return res.status(500).json({ error: 'Gagal menyimpan data' }); }
        res.json({ message: 'Data berhasil ditambahkan!', insertedId: results.insertId });
    });
});

// Rute PUT dengan multi-upload
app.put('/api/paket-wisata/update/:id', upload.fields([
    { name: 'gambar', maxCount: 1 },
    { name: 'galeri_gambar', maxCount: 10 }
]), (req, res) => {
    const idPaket = parseInt(req.params.id, 10);
    const dataUpdate = { 
        nama: req.body.nama, 
        tujuan: req.body.tujuan, 
        harga: req.body.harga,
        deskripsi: req.body.deskripsi,
        itinerary: req.body.itinerary
    };
    if (req.files && req.files['gambar']) {
        dataUpdate.gambar_url = req.files['gambar'][0].filename;
    }
    if (req.files && req.files['galeri_gambar']) {
        let galeriFileNames = req.files['galeri_gambar'].map(file => file.filename);
        dataUpdate.galeri_gambar = JSON.stringify(galeriFileNames);
    }
    const sqlQuery = 'UPDATE paket_wisata SET ? WHERE id = ?';
    db.query(sqlQuery, [dataUpdate, idPaket], (err, results) => {
        if (err) { console.error(err); return res.status(500).json({ error: 'Gagal memperbarui data' }); }
        if (results.affectedRows > 0) res.json({ message: `Data berhasil diperbarui!` });
        else res.status(404).json({ message: 'Data tidak ditemukan.' });
    });
});

// Rute DELETE
app.delete('/api/paket-wisata/hapus/:id', (req, res) => {
    const idPaket = req.params.id;
    const sqlQuery = 'DELETE FROM paket_wisata WHERE id = ?';
    db.query(sqlQuery, [idPaket], (err, results) => { if (err) return res.status(500).json({ error: 'Gagal menghapus data' }); if (results.affectedRows > 0) res.json({ message: `Data berhasil dihapus!` }); else res.status(404).json({ message: 'Data tidak ditemukan.' }); });
});

app.listen(port, () => { console.log(`Server berhasil berjalan di port ${port}`); });
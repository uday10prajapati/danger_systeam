// CREATE TABLE village (
//   id INT AUTO_INCREMENT PRIMARY KEY,
//   village_code VARCHAR(50),
//   village_name VARCHAR(255),
//   taluka_name VARCHAR(255),
//   district_name VARCHAR(255),
//   no_of_villages INT
// );
import express from 'express';
import { query } from '../db.js';

const router = express.Router();

// GET ALL FIRST (IMPORTANT)
router.get("/", async (req, res) => {
  try {
    const rows = await query(
      "SELECT * FROM village ORDER BY CAST(village_code AS UNSIGNED) ASC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET LAST CODE
router.get("/last-code", async (req, res) => {
  try {
    const rows = await query(
      "SELECT village_code FROM village ORDER BY id DESC LIMIT 1"
    );
    const last = rows.length > 0 ? parseInt(rows[0].village_code) : 0;
    res.json({ lastCode: last });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET BY ID
router.get("/:id", async (req, res) => {
  try {
    const rows = await query(
      "SELECT * FROM village WHERE id = ?",
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE
router.post("/api/village", async (req, res) => {
  try {
    const { villageCode, villageName, talukaName, districtName, noOfVillage } = req.body;
    const result = await query(
      "INSERT INTO village (village_code, village_name, taluka_name, district_name, no_of_villages) VALUES (?, ?, ?, ?, ?)",
      [villageCode, villageName, talukaName, districtName, noOfVillage || 0]
    );
    res.json({ id: result.insertId, villageCode, villageName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE
router.put("/:id", async (req, res) => {
  try {
    const { villageCode, villageName, talukaName, districtName, noOfVillage } = req.body;
    await query(
      "UPDATE village SET village_code = ?, village_name = ?, taluka_name = ?, district_name = ?, no_of_villages = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [villageCode, villageName, talukaName, districtName, noOfVillage || 0, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    await query("DELETE FROM village WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

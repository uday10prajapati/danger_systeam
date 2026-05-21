import express from 'express';
import { query } from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'];
    const financialYear = req.headers['x-financial-year'];
    const {
      startDate,
      endDate,
      memberId,
      village,
      bankName,
      season,
      dangarClass,
      fromMemberCode,
      toMemberCode
    } = req.query;

    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company context required' });
    }

    let sql = `
      SELECT
        de.id,
        de.sr_no,
        de.entry_date,
        de.vehicle_no,
        de.quality_class,
        de.season,
        de.total_kg,
        de.bardan AS returned_bags,
        de.gun,
        de.gross_quintal,
        de.less_bardan,
        de.net_quintal,
        de.rate,
        de.amount,
        de.remark,
        mm.id AS member_id,
        mm.member_code,
        mm.member_name,
        mm.member_name_gu,
        mm.eng_name,
        mm.village_name,
        im.item_name,
        im.item_name_gu,
        (
          SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
            'id', dw.id,
            'sr_no', dw.sr_no,
            'weight', dw.weight
          ) ORDER BY dw.sr_no ASC), '[]'::json)
          FROM dangar_weights dw
          WHERE dw.entry_id = de.id
        ) AS weights,
        (
          SELECT jbe.id
          FROM jama_bardan_entry jbe
          WHERE jbe.company_id = de.company_id
            AND jbe.pavti_no = de.sr_no
            AND (jbe.code = mm.member_code OR jbe.member_id = mm.id)
          ORDER BY jbe.id DESC
          LIMIT 1
        ) AS jama_entry_id,
        (
          SELECT jbe.qty
          FROM jama_bardan_entry jbe
          WHERE jbe.company_id = de.company_id
            AND jbe.pavti_no = de.sr_no
            AND (jbe.code = mm.member_code OR jbe.member_id = mm.id)
          ORDER BY jbe.id DESC
          LIMIT 1
        ) AS jama_qty
      FROM dangar_entry de
      LEFT JOIN member_master mm ON de.member_id = mm.id
      LEFT JOIN item_master im ON de.item_id = im.id
      WHERE de.company_id = ?
    `;

    const params = [companyId];

    if (financialYear) {
      sql += ' AND de.financial_year = ?';
      params.push(financialYear);
    }
    if (startDate && endDate) {
      sql += ' AND de.entry_date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }
    if (memberId && memberId !== 'all') {
      sql += ' AND de.member_id = ?';
      params.push(memberId);
    }
    if (village) {
      sql += ' AND mm.village_name = ?';
      params.push(village);
    }
    if (bankName) {
      sql += ' AND mm.bank_name = ?';
      params.push(bankName);
    }
    if (season) {
      sql += ' AND de.season = ?';
      params.push(season);
    }
    if (dangarClass) {
      sql += ' AND de.quality_class = ?';
      params.push(dangarClass);
    }
    if (fromMemberCode) {
      sql += ' AND mm.member_code >= ?';
      params.push(fromMemberCode);
    }
    if (toMemberCode) {
      sql += ' AND mm.member_code <= ?';
      params.push(toMemberCode);
    }

    sql += ' ORDER BY de.entry_date DESC, de.id DESC';

    const rows = await query(sql, params);
    const data = (rows || []).map(row => {
      let weights = row.weights || [];
      if (typeof weights === 'string') {
        try {
          weights = JSON.parse(weights);
        } catch {
          weights = [];
        }
      }

      return {
        ...row,
        weights: Array.isArray(weights) ? weights : [],
        returned_bags: parseFloat(row.returned_bags || 0),
        total_kg: parseFloat(row.total_kg || 0),
        net_quintal: parseFloat(row.net_quintal || 0),
        amount: parseFloat(row.amount || 0),
        jama_qty: parseFloat(row.jama_qty || 0)
      };
    });

    const totals = data.reduce((acc, row) => {
      acc.entries += 1;
      acc.bardan += parseFloat(row.returned_bags || 0);
      acc.weight += parseFloat(row.total_kg || 0);
      acc.net_quintal += parseFloat(row.net_quintal || 0);
      acc.amount += parseFloat(row.amount || 0);
      return acc;
    }, { entries: 0, bardan: 0, weight: 0, net_quintal: 0, amount: 0 });

    res.json({ success: true, data, totals });
  } catch (error) {
    console.error('Bardan report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

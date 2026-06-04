const db = require('./db');
const sanitizeHtml = require('sanitize-html');
const util = require('./util');

module.exports = {
  view: (req, res) => {
    db.query('SELECT * FROM code ORDER BY main_id, sub_id, start', (error, codes) => {
      if (error) throw error;
      util.render(req, res, 'code.ejs', { codes });
    });
  },

  create: (req, res) => {
    util.render(req, res, 'codeCU.ejs', { mode: 'create', code: {} });
  },

  create_process: (req, res) => {
    const p = req.body;
    const values = ['main_id','sub_id','main_name','sub_name','start','end'].map(k => sanitizeHtml(p[k] || ''));
    const sql = 'INSERT INTO code(main_id, sub_id, main_name, sub_name, start, end) VALUES(?, ?, ?, ?, ?, ?)';
    db.query(sql, values, (error) => {
      if (error) throw error;
      res.redirect('/code/view');
    });
  },

  update: (req, res) => {
    const sql = 'SELECT * FROM code WHERE main_id=? AND sub_id=? AND start=? AND end=?';
    db.query(sql, [req.params.main, req.params.sub, req.params.start, req.params.end], (error, result) => {
      if (error) throw error;
      if (result.length === 0) return res.redirect('/code/view');
      util.render(req, res, 'codeCU.ejs', { mode: 'update', code: result[0] });
    });
  },

  update_process: (req, res) => {
    const p = req.body;
    const sql = `UPDATE code
                 SET main_name=?, sub_name=?, end=?
                 WHERE main_id=? AND sub_id=? AND start=?`;
    const values = [p.main_name, p.sub_name, p.end, p.main_id, p.sub_id, p.start].map(v => sanitizeHtml(v || ''));
    db.query(sql, values, (error) => {
      if (error) throw error;
      res.redirect('/code/view');
    });
  },

  delete_process: (req, res) => {
    const sql = 'DELETE FROM code WHERE main_id=? AND sub_id=? AND start=? AND end=?';
    db.query(sql, [req.params.main, req.params.sub, req.params.start, req.params.end], (error) => {
      if (error) throw error;
      res.redirect('/code/view');
    });
  }
};

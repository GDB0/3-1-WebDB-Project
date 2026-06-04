const db = require('./db');
const sanitizeHtml = require('sanitize-html');
const util = require('./util');

function clean(v){ return sanitizeHtml(String(v || '')); }
function isAdmin(req){ return util.authInfo(req).cls === 'MNG'; }
function deny(res){ res.redirect('/'); }

module.exports = {
  view: (req, res) => {
    if(!isAdmin(req)) return deny(res);
    const search = sanitizeHtml(req.query.search || '');
    let sql = 'SELECT * FROM person';
    let params = [];
    if (search !== '') {
      sql += ' WHERE loginid LIKE ? OR name LIKE ? OR tel LIKE ? OR class LIKE ?';
      params = [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`];
    }
    sql += ' ORDER BY loginid';
    db.query(sql, params, (error, persons) => {
      if (error) throw error;
      util.render(req, res, 'person.ejs', { persons, search });
    });
  },

  create: (req, res) => {
    if(!isAdmin(req)) return deny(res);
    util.render(req, res, 'personCU.ejs', { mode: 'create', person: {}, signup: false });
  },

  signup: (req, res) => {
    util.render(req, res, 'personCU.ejs', { mode: 'create', person: {}, signup: true });
  },

  create_process: (req, res) => {
    const p = req.body;
    const signup = p.signup === 'Y';
    if(!signup && !isAdmin(req)) return deny(res);
    const cls = signup ? 'CST' : clean(p.class || 'CST');
    const sql = `INSERT INTO person(loginid, password, name, mf, address, tel, birth, class)
                 VALUES(?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [p.loginid, p.password, p.name, p.mf, p.address, p.tel, p.birth].map(clean);
    values.push(cls);
    db.query(sql, values, (error) => {
      if (error) throw error;
      res.redirect(signup ? '/auth/login' : '/person/view');
    });
  },

  update: (req, res) => {
    if(!isAdmin(req)) return deny(res);
    db.query('SELECT * FROM person WHERE loginid=?', [req.params.loginId], (error, result) => {
      if (error) throw error;
      if (result.length === 0) return res.redirect('/person/view');
      util.render(req, res, 'personCU.ejs', { mode: 'update', person: result[0], signup: false });
    });
  },

  update_process: (req, res) => {
    if(!isAdmin(req)) return deny(res);
    const p = req.body;
    const sql = `UPDATE person
                 SET password=?, name=?, mf=?, address=?, tel=?, birth=?, class=?
                 WHERE loginid=?`;
    const values = [p.password, p.name, p.mf, p.address, p.tel, p.birth, p.class, p.loginid].map(clean);
    db.query(sql, values, (error) => {
      if (error) throw error;
      res.redirect('/person/view');
    });
  },

  delete_process: (req, res) => {
    if(!isAdmin(req)) return deny(res);
    db.query('DELETE FROM person WHERE loginid=?', [req.params.loginId], (error) => {
      if (error) throw error;
      res.redirect('/person/view');
    });
  }
};

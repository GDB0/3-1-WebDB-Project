const express = require('express');
const router = express.Router();
const dbadmin = require('../lib/dbadmin');

router.get('/tableManage', dbadmin.tableManage);
router.get('/tableView/:tableName', dbadmin.tableView);
router.get('/customeranal', dbadmin.customeranal);

module.exports = router;

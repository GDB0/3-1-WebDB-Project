const express = require('express');
const router = express.Router();
const root = require('../lib/root');

router.get('/', (req, res) => root.home(req, res));
router.get('/category/:main/:sub', (req, res) => root.category(req, res));
router.post('/search', (req, res) => root.search(req, res));
router.get('/detail/:prodId', (req, res) => root.detail(req, res));

module.exports = router;

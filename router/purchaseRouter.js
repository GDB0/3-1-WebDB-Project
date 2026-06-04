const express = require('express');
const router = express.Router();
const purchase = require('../lib/purchase');

router.get('/', purchase.purchase);
router.get('/detail/:prodId', purchase.purchasedetail);
router.post('/purchase_process', purchase.purchase_process);
router.post('/cart_process', purchase.cart_process);
router.get('/cart', purchase.cart);
router.post('/cartpurchase_process', purchase.cartpurchase_process);
router.post('/cartdelete_process', purchase.cartdelete_process);
router.get('/cancel/:purchaseId', purchase.cancel_process);

router.get('/cart/view', purchase.cartview);
router.get('/cart/update/:cartId', purchase.cartupdate);
router.post('/cart/update_process', purchase.cartupdate_process);
router.get('/cart/delete/:cartId', purchase.cartdelete_admin);

router.get('/view', purchase.purchaseview);
router.get('/update/:purchaseId', purchase.purchaseupdate);
router.post('/update_process', purchase.purchaseupdate_process);
router.get('/delete/:purchaseId', purchase.purchasedelete_admin);

module.exports = router;

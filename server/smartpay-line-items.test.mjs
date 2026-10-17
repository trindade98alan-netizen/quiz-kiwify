import {test} from 'node:test';
import assert from 'node:assert/strict';
import {receiptShape,validSecret} from './smartpay-receipt.mjs';

test('a receipt preserves all four products while bounding large arrays',()=>{
 const products=Array.from({length:4},(_,i)=>({id:`product-${i}`}));
 assert.deepEqual(receiptShape({products}).products,products);
 assert.equal(receiptShape({products:Array(50).fill({id:'product'})}).products.length,20);
});
test('receipt keeps identifiers needed for delivery and hides unrelated sensitive fields',()=>{
 const data=receiptShape({event:'order.approved',orderId:'order-123',customer:{email:'buyer@example.invalid',cpf:'private-document'},card:{number:'private-card'},secret:'private-secret'});
 assert.equal(data.customer.email,'buyer@example.invalid');
 assert.equal(data.customer.cpf,'[string]');
 assert.equal(data.card.number,'[string]');
 assert.equal(data.secret,'[string]');
});
test('diagnostic endpoint authentication still rejects a wrong shared secret',()=>{
 const expected='test-only-secret-long-enough-for-validation';
 assert.equal(validSecret(expected,expected),true);
 assert.equal(validSecret('wrong',expected),false);
});

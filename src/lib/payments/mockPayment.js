export async function fakeCharge({ amount, currency, description }) {
  // 模拟 1.2s 支付成功
  await new Promise(r => setTimeout(r, 1200));
  return { success: true, chargeId: 'ch_mock_' + Date.now(), amount, currency, description };
}

import { useEffect, useState } from 'react';
import { creditsApi } from '../api/creditsApi';

export const CreditsPage = () => {
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchaseAmount, setPurchaseAmount] = useState(10);

  const load = () => {
    setLoading(true);
    Promise.all([
      creditsApi.getBalance().then(d => setBalance(d?.balance ?? d ?? 0)),
      creditsApi.getTransactions().then(d => setTransactions(d?.transactions || d || [])),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handlePurchase = async () => {
    try {
      const res = await creditsApi.purchaseCredits({ amount: purchaseAmount });
      if (res?.url) window.location.href = res.url;
      else load();
    } catch (e) { console.error(e); }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Credits</h1>
      <div className="bg-white border rounded-lg p-6 mb-6">
        <p className="text-gray-500 text-sm">Current Balance</p>
        <p className="text-3xl font-bold">{balance ?? 0} credits</p>
      </div>
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="font-semibold mb-3">Purchase Credits</h2>
        <div className="flex items-center gap-3">
          <input type="number" min={1} value={purchaseAmount} onChange={e => setPurchaseAmount(Number(e.target.value) || 10)} className="border rounded px-3 py-2 w-24" />
          <button onClick={handlePurchase} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Purchase</button>
        </div>
      </div>
      <div className="bg-white border rounded-lg p-6">
        <h2 className="font-semibold mb-3">Transaction History</h2>
        {transactions.length === 0 ? (
          <p className="text-gray-500">No transactions</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2">Date</th>
                <th className="py-2">Type</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Description</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t: any, i: number) => (
                <tr key={t.id || i} className="border-b">
                  <td className="py-2">{t.created_at ? new Date(t.created_at).toLocaleDateString() : ''}</td>
                  <td className="py-2 capitalize">{t.type || t.transaction_type || ''}</td>
                  <td className="py-2 font-medium">{t.amount ?? t.points ?? 0}</td>
                  <td className="py-2 text-gray-500">{t.description || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
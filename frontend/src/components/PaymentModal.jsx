import { useState } from 'react'
import api from '../api/axios'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function PaymentModal({ month, year, amount, onSuccess, onClose }) {
  const [step, setStep] = useState('confirm') // confirm → processing → success → failed
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [cardNumber, setCardNumber] = useState('')
  const [error, setError] = useState('')

  async function handlePay() {
    setStep('processing')
    setError('')
    try {
      // Step 1 — Create order
      const orderRes = await api.post('/payments/online/create-order', {
        month, year, amount
      })
      const { order_id } = orderRes.data

      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Step 2 — Simulate payment_id (Razorpay returns this after checkout)
      const payment_id = `pay_${Math.random().toString(36).substr(2, 16)}`

      // Step 3 — Verify payment
      await api.post('/payments/online/verify', {
        order_id,
        payment_id,
        month,
        year,
        amount
      })

      setStep('success')
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 2000)
    } catch (err) {
      setStep('failed')
      setError(err.response?.data?.detail || 'Payment failed')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">

        {/* Header */}
        <div className="bg-gray-900 px-6 py-4 flex justify-between items-center">
          <div>
            <p className="text-gray-400 text-xs">Karate School</p>
            <p className="text-white font-bold text-lg">Rs.{amount}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-xs">For</p>
            <p className="text-white text-sm font-medium">{MONTHS[month - 1]} {year}</p>
          </div>
        </div>

        {/* Processing State */}
        {step === 'processing' && (
          <div className="p-8 flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-600 font-medium">Processing payment...</p>
          </div>
        )}

        {/* Success State */}
        {step === 'success' && (
          <div className="p-8 flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-3xl">
              ✅
            </div>
            <p className="font-bold text-gray-900 text-lg">Payment Successful!</p>
            <p className="text-gray-500 text-sm text-center">
              Rs.{amount} paid for {MONTHS[month - 1]} {year}
            </p>
          </div>
        )}

        {/* Failed State */}
        {step === 'failed' && (
          <div className="p-8 flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-3xl">
              ❌
            </div>
            <p className="font-bold text-gray-900 text-lg">Payment Failed</p>
            <p className="text-red-500 text-sm text-center">{error}</p>
            <div className="flex gap-3 w-full mt-2">
              <button
                onClick={() => setStep('confirm')}
                className="flex-1 bg-gray-900 text-white py-2.5 rounded-xl font-semibold text-sm"
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                className="flex-1 border py-2.5 rounded-xl font-semibold text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Confirm State */}
        {step === 'confirm' && (
          <div className="p-6 space-y-4">
            {/* Payment Method Toggle */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Payment Method</p>
              <div className="flex gap-2">
                {[
                  { value: 'card', label: '💳 Card' },
                  { value: 'upi', label: '📱 UPI' },
                  { value: 'netbanking', label: '🏦 Net Banking' }
                ].map(m => (
                  <button
                    key={m.value}
                    onClick={() => setPaymentMethod(m.value)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                      paymentMethod === m.value
                        ? 'border-gray-900 bg-gray-50'
                        : 'border-gray-200 text-gray-500'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Card Fields */}
            {paymentMethod === 'card' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Card Number</label>
                  <input
                    placeholder="4111 1111 1111 1111"
                    value={cardNumber}
                    onChange={e => setCardNumber(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                    maxLength={19}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Expiry</label>
                    <input placeholder="MM/YY" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">CVV</label>
                    <input placeholder="123" type="password" maxLength={3} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                  </div>
                </div>
              </div>
            )}

            {/* UPI Field */}
            {paymentMethod === 'upi' && (
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">UPI ID</label>
                <input
                  placeholder="yourname@upi"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
            )}

            {/* Net Banking */}
            {paymentMethod === 'netbanking' && (
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Select Bank</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
                  <option>State Bank of India</option>
                  <option>HDFC Bank</option>
                  <option>ICICI Bank</option>
                  <option>Axis Bank</option>
                  <option>Kotak Mahindra</option>
                </select>
              </div>
            )}

            {/* Test Mode Notice */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
              <p className="text-xs text-yellow-700 font-medium">🧪 Test Mode — no real charges</p>
            </div>

            {/* Pay Button */}
            <button
              onClick={handlePay}
              className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-gray-700 transition-colors"
            >
              Pay Rs.{amount}
            </button>
            <button
              onClick={onClose}
              className="w-full border border-gray-200 py-2.5 rounded-xl font-semibold text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default PaymentModal
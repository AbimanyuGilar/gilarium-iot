import { NextResponse } from 'next/server';
import midtransClient from 'midtrans-client';

const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: process.env.MIDTRANS_SERVER_KEY || '',
  clientKey: process.env.MIDTRANS_CLIENT_KEY || '',
});

export async function POST(request: Request) {
  try {
    const notificationJson = await request.json();

    // Verifikasi otomatis via SDK (Signature Key langsung dicek di sini)
    const statusResponse = await (snap as any).transaction.notification(notificationJson);

    const orderId = statusResponse.order_id;
    const transactionStatus = statusResponse.transaction_status;
    const fraudStatus = statusResponse.fraud_status;

    if (transactionStatus === 'capture' && fraudStatus === 'accept') {
      // await updateOrderStatus(orderId, 'PAID');
    } else if (transactionStatus === 'settlement') {
      // await updateOrderStatus(orderId, 'PAID');
    } else if (
      transactionStatus === 'cancel' ||
      transactionStatus === 'deny' ||
      transactionStatus === 'expire'
    ) {
      // await updateOrderStatus(orderId, 'FAILED');
    } else if (transactionStatus === 'pending') {
      // await updateOrderStatus(orderId, 'PENDING');
    }

    console.log({
      transactionStatus,
      fraudStatus
    })

    return NextResponse.json({ status: 'OK' });
  } catch (error) {
    console.error('Notification error / Invalid signature:', error);
    return NextResponse.json({ message: 'Unauthorized / Invalid' }, { status: 401 });
  }
}
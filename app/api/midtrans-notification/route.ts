import { NextResponse } from "next/server";
import midtransClient from 'midtrans-client'
import { prisma } from "@/lib/prisma";
import { PaymentStatus } from "@/lib/generated/prisma/enums";  

export async function POST(request: Request) {
  const apiClient = new midtransClient.Snap({
    isProduction: process.env.MIDTRANS_ENV === 'production',
    serverKey: process.env.MIDTRANS_SERVER_KEY ?? '',
    clientKey: process.env.MIDTRANS_CLIENT_KEY ?? '',
  })

  const requestJson = await request.json()
  
  const statusResponse = await (apiClient as any).transaction.notification(requestJson)

  const { 
    order_id: orderId, 
    transaction_status: transactionStatus, 
    fraud_status: fraudStatus,
    payment_type: paymentMethod
  } = statusResponse
  
  async function updateTransaction(status: PaymentStatus) {
    await prisma.$transaction(async tx => {
      const transaction = await tx.transaction.update({
        where: {
          invoiceNo: orderId
        },
        data: {
          paymentStatus: status,
          paymentMethod,
          ...(status === 'PAID' ? { paidAt: new Date() } : {})
        }
      })

      if (status === 'PAID') {
        const transactionItems = await tx.transactionItem.findMany({
          where: {
            transactionId: transaction.id
          }
        })

        await Promise.all(
          transactionItems.map(item =>
            tx.product.update({
              where: {
                id: item.productId
              },
              data: {
                stock: {
                  decrement: item.quantity
                }
              }
            })
          )
        )
      }
    })
  } 
  
  if (transactionStatus == 'capture'){
    if (fraudStatus == 'accept'){
      try {
        await updateTransaction('PAID')
        return NextResponse.json({status: 'OK'})
      } catch {
        return NextResponse.json({status: 500})
      }
    }
  } else if (transactionStatus == 'settlement'){
    try {
      await updateTransaction('PAID')
      return NextResponse.json({status: 'OK'})
    } catch {
      return NextResponse.json({status: 500})
    }
  } else if (transactionStatus == 'cancel' ||
    transactionStatus == 'deny' ||
    transactionStatus == 'expire'){
    try {
      await updateTransaction('FAILED')
      return NextResponse.json({status: 'OK'})
    } catch {
      return NextResponse.json({status: 500})
    }
  } else if (transactionStatus == 'pending'){
    try {
      await updateTransaction('PENDING')
      return NextResponse.json({status: 'OK'})
    } catch {
      return NextResponse.json({status: 500})
    }
  }
}
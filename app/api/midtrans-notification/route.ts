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
  
  const statusResponse = await (apiClient as any).transaction.notification()

  
  const { 
    order_id: orderId, 
    transaction_status: transactionStatus, 
    fraudStatus: fraudStatus 
  } = statusResponse
  
  async function updateStatus(status: PaymentStatus) {
    await prisma.$transaction(async tx => {
      const order = await tx.transaction.findUnique({
        where: {
          invoiceNo: orderId
        },
        select: {
          id: true
        }
      })
      await tx.transaction.update({
        where: {
          id: order?.id
        },
        data: {
          paymentStatus: status
        }
      })
    })
  } 
  
  if (transactionStatus == 'capture'){
    if (fraudStatus == 'accept'){
      // TODO set transaction status on your database to 'success'
      try {
        await updateStatus('PAID')
        // and response with 200 OK
        return NextResponse.json({status: 'OK'})
      } catch {
        return NextResponse.json({status: 500})
      }
    }
  } else if (transactionStatus == 'settlement'){
      // TODO set transaction status on your database to 'success'
      try {
        await updateStatus('PAID')
        // and response with 200 OK
        return NextResponse.json({status: 'OK'})
      } catch {
        return NextResponse.json({status: 500})
      }
  } else if (transactionStatus == 'cancel' ||
    transactionStatus == 'deny' ||
    transactionStatus == 'expire'){
    // TODO set transaction status on your database to 'failure'
    try {
      await updateStatus('FAILED')
      // and response with 200 OK
      return NextResponse.json({status: 'OK'})
    } catch {
      return NextResponse.json({status: 500})
    }
    // and response with 200 OK
  } else if (transactionStatus == 'pending'){
    // TODO set transaction status on your database to 'pending' / waiting payment
    try {
      await updateStatus('PENDING')
      // and response with 200 OK
      return NextResponse.json({status: 'OK'})
    } catch {
      return NextResponse.json({status: 500})
    }
  }
}
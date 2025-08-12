import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class TransactionRepository {
  /**
   * Create transaction
   * @returns
   */
  static async createTransaction({
    booking_id,
    amount,
    currency,
    reference_number,
    status = 'pending',
    user_id,
  }: {
    booking_id: string;
    amount?: number;
    currency?: string;
    reference_number?: string;
    status?: string;
    user_id?: string;
  }) {
    const data: any = {};
    const booking = await prisma.booking.findUnique({
      where: {
        id: booking_id,
      },
    });
    if (!booking) {
      return {
        success: false,
        message: 'Booking not found',
      };
    }
    if (booking_id) {
      data['booking_id'] = booking_id;
    }
    if (amount) {
      data['amount'] = Number(amount);
    }
    if (currency) {
      data['currency'] = currency;
    }
    if (reference_number) {
      data['reference_number'] = reference_number;
    }
    if (status) {
      data['status'] = status;
    }
    if (user_id) {
      data['user_id'] = user_id;
    }

    // Set default type for booking payments
    data['type'] = 'booking';

    try {
      return await prisma.paymentTransaction.create({
        data: data,
      });
    } catch (error) {
      console.error('Error creating payment transaction:', error);
      throw error;
    }
  }

  /**
   * Update transaction
   * @returns
   */
  static async updateTransaction({
    reference_number,
    status = 'pending',
    paid_amount,
    paid_currency,
    raw_status,
  }: {
    reference_number: string;
    status: string;
    paid_amount?: number;
    paid_currency?: string;
    raw_status?: string;
  }) {
    const data = {};
    const order_data = {};
    if (status) {
      data['status'] = status;
      order_data['payment_status'] = status;
    }
    if (paid_amount) {
      data['paid_amount'] = Number(paid_amount);
      order_data['paid_amount'] = Number(paid_amount);
    }
    if (paid_currency) {
      data['paid_currency'] = paid_currency;
      order_data['paid_currency'] = paid_currency;
    }
    if (raw_status) {
      data['raw_status'] = raw_status;
      order_data['payment_raw_status'] = raw_status;
    }


    try {
      const transaction = await prisma.paymentTransaction.findFirst({
        where: { reference_number: reference_number },
        include: { booking: true }
      });

      if (transaction?.booking_id) {
        // Update booking payment status to succeeded
        await prisma.booking.update({
          where: { id: transaction.booking_id },
          data: {
            payment_status: 'succeeded',
            paid_amount: paid_amount,
            paid_currency: paid_currency
          }
        });

        console.log('Booking payment status updated to succeeded for booking:', transaction.booking_id);
      } else {
        console.error('No booking found for payment intent:', reference_number);
      }
    } catch (error) {
      console.error('Error updating booking status or calculating commissions:', error);
    }


    return await prisma.paymentTransaction.updateMany({
      where: {
        reference_number: reference_number,
      },
      data: {
        ...data,
      },
    });
  }
}

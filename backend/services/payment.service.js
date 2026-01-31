const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Payment = require('../models/Payment');
const Order = require('../models/Order');

class PaymentService {
    async createPaymentIntent(orderId, amount, currency = 'usd') {
        try {
            const order = await Order.findById(orderId);
            if (!order) {
                throw new Error('Order not found');
            }

            // Create Stripe Payment Intent
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(amount * 100), // Convert to cents
                currency,
                metadata: {
                    orderId: orderId.toString(),
                    userId: order.customer.toString()
                },
                automatic_payment_methods: {
                    enabled: true,
                },
            });

            // Update payment record
            const payment = await Payment.findOneAndUpdate(
                { order: orderId },
                {
                    paymentIntentId: paymentIntent.id,
                    clientSecret: paymentIntent.client_secret,
                    status: 'requires_payment_method'
                },
                { new: true }
            );

            return {
                clientSecret: paymentIntent.client_secret,
                paymentId: payment._id,
                amount: amount,
                currency
            };
        } catch (error) {
            console.error('Payment intent creation failed:', error);
            throw error;
        }
    }

    async confirmPayment(paymentIntentId) {
        try {
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
            
            if (paymentIntent.status === 'succeeded') {
                // Update payment record
                const payment = await Payment.findOneAndUpdate(
                    { paymentIntentId },
                    {
                        status: 'completed',
                        paidAt: new Date(),
                        paymentMethod: paymentIntent.payment_method_types[0],
                        transactionId: paymentIntent.charges.data[0].id
                    },
                    { new: true }
                );

                // Update order status
                await Order.findByIdAndUpdate(payment.order, { status: 'processing' });

                return {
                    success: true,
                    payment,
                    message: 'Payment confirmed successfully'
                };
            }

            return {
                success: false,
                status: paymentIntent.status,
                message: `Payment status: ${paymentIntent.status}`
            };
        } catch (error) {
            console.error('Payment confirmation failed:', error);
            throw error;
        }
    }

    async createSubscription(customerId, priceId, metadata = {}) {
        try {
            const subscription = await stripe.subscriptions.create({
                customer: customerId,
                items: [{ price: priceId }],
                payment_behavior: 'default_incomplete',
                expand: ['latest_invoice.payment_intent'],
                metadata
            });

            return {
                subscriptionId: subscription.id,
                clientSecret: subscription.latest_invoice.payment_intent.client_secret,
                status: subscription.status
            };
        } catch (error) {
            console.error('Subscription creation failed:', error);
            throw error;
        }
    }

    async cancelSubscription(subscriptionId) {
        try {
            const subscription = await stripe.subscriptions.cancel(subscriptionId);
            return {
                success: true,
                status: subscription.status,
                canceledAt: new Date()
            };
        } catch (error) {
            console.error('Subscription cancellation failed:', error);
            throw error;
        }
    }

    async createCustomer(email, name, paymentMethodId) {
        try {
            const customer = await stripe.customers.create({
                email,
                name,
                payment_method: paymentMethodId,
                invoice_settings: {
                    default_payment_method: paymentMethodId
                }
            });

            return {
                customerId: customer.id,
                email: customer.email,
                name: customer.name
            };
        } catch (error) {
            console.error('Customer creation failed:', error);
            throw error;
        }
    }

    async getPaymentMethods(customerId) {
        try {
            const paymentMethods = await stripe.paymentMethods.list({
                customer: customerId,
                type: 'card'
            });

            return paymentMethods.data.map(method => ({
                id: method.id,
                type: method.type,
                card: {
                    brand: method.card.brand,
                    last4: method.card.last4,
                    expMonth: method.card.exp_month,
                    expYear: method.card.exp_year
                }
            }));
        } catch (error) {
            console.error('Failed to get payment methods:', error);
            throw error;
        }
    }

    async refundPayment(paymentIntentId, amount = null) {
        try {
            const refundParams = { payment_intent: paymentIntentId };
            if (amount) {
                refundParams.amount = Math.round(amount * 100);
            }

            const refund = await stripe.refunds.create(refundParams);

            // Update payment record
            await Payment.findOneAndUpdate(
                { paymentIntentId },
                {
                    status: 'refunded',
                    refundedAt: new Date(),
                    refundAmount: amount || refund.amount / 100
                }
            );

            // Update order status
            const payment = await Payment.findOne({ paymentIntentId });
            await Order.findByIdAndUpdate(payment.order, { status: 'refunded' });

            return {
                success: true,
                refundId: refund.id,
                amount: refund.amount / 100,
                status: refund.status
            };
        } catch (error) {
            console.error('Refund failed:', error);
            throw error;
        }
    }

    async handleWebhook(signature, payload) {
        try {
            const event = stripe.webhooks.constructEvent(
                payload,
                signature,
                process.env.STRIPE_WEBHOOK_SECRET
            );

            switch (event.type) {
                case 'payment_intent.succeeded':
                    await this.confirmPayment(event.data.object.id);
                    break;

                case 'payment_intent.payment_failed':
                    await Payment.findOneAndUpdate(
                        { paymentIntentId: event.data.object.id },
                        { status: 'failed' }
                    );
                    break;

                case 'customer.subscription.deleted':
                    // Handle subscription cancellation
                    console.log('Subscription cancelled:', event.data.object.id);
                    break;

                default:
                    console.log(`Unhandled event type: ${event.type}`);
            }

            return { success: true };
        } catch (error) {
            console.error('Webhook handling failed:', error);
            throw error;
        }
    }
}

module.exports = new PaymentService();

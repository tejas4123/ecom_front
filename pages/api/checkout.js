import {mongooseConnect} from "@/lib/mongoose";
import {Product} from "@/models/Product";
import {Order} from "@/models/Order";
import {getServerSession} from "next-auth";
import {authOptions} from "@/pages/api/auth/[...nextauth]";
import {Setting} from "@/models/Setting";
const stripe = require('stripe')(process.env.STRIPE_SK);
// const razorpay = require('razorpay')(process.env.RAZORPAY_KEY_ID, process.env.RAZORPAY_KEY_SECRET);

export default async function handler(req,res) {

  try {
    // Your existing code here
    if (req.method !== 'POST') {
      res.json('should be a POST request');
      return;
    }
    
      const {
        name,email,city,
        postalCode,streetAddress,country,
        cartProducts,
      } = req.body;
      await mongooseConnect();
      const productsIds = cartProducts.split(',');
      const uniqueIds = [...new Set(productsIds)];
      const productsInfos = await Product.find({_id:uniqueIds});
    
      let line_items = [];
      for (const productId of uniqueIds) {
        const productInfo = productsInfos.find(p => p._id.toString() === productId);
        const quantity = productsIds.filter(id => id === productId)?.length || 0;
        if (quantity > 0 && productInfo) {
          line_items.push({
            quantity,
            price_data: {
              currency: 'USD',
              product_data: {name:productInfo.title},
              unit_amount: quantity * productInfo.price * 100,
            },
          });
        }
      }
  
      res.json({line_items});
    
      const session = await getServerSession(req,res,authOptions);
    
      const orderDoc = await Order.create({
        line_items,name,email,city,postalCode,
        streetAddress,country,paid:false,
        userEmail: session?.user?.email,
      });
    
      const shippingFeeSetting = await Setting.findOne({name:'shippingFee'});
      const shippingFeeCents = parseInt(shippingFeeSetting.value || '0') * 100;
    
      const stripeSession = await stripe.checkout.sessions.create({
        line_items,
        mode: 'payment',
        customer_email: email,
        success_url: process.env.PUBLIC_URL + '/cart?success=1',
        cancel_url: process.env.PUBLIC_URL + '/cart?canceled=1',
        metadata: {orderId:orderDoc._id.toString()},
        allow_promotion_codes: true,
        shipping_options: [
          {
            shipping_rate_data: {
              display_name: 'shipping fee',
              type: 'fixed_amount',
              fixed_amount: {amount: shippingFeeCents, currency: 'USD'},
            },
          }
        ],
      });
    
      res.json({
        url:stripeSession.url,
      })
   
    
  }  catch (error) {
  
    console.error('Error in the handler:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
  

  

  // const order = await razorpay.orders.create({
  //   line_items,
  //   mode: 'payment',
  //   customer_email: email,
  //   success_url: process.env.PUBLIC_URL + '/cart?success=1',
  //   cancel_url: process.env.PUBLIC_URL + '/cart?canceled=1',
  //   metadata: {orderId:orderDoc._id.toString()},
  //   allow_promotion_codes: true,
  //   shipping_options: [
  //     {
  //       shipping_rate_data: {
  //         display_name: 'shipping fee',
  //         type: 'fixed_amount',
  //         fixed_amount: {amount: shippingFeeCents, currency: 'USD'},
  //       },
  //     }
  //   ],
  //   // amount: totalAmountInPaisa, // Amount in paisa (e.g., 1000 for ₹10.00)
  //   // currency: 'INR', // Change to your desired currency
  //   // receipt: 'order_receipt_123',
  //   // payment_capture: 1, // Auto-capture payment after order creation
  //   // notes: {
  //   //   orderId: orderDoc._id.toString(),
  //   // },
  // });

  // res.json({
  //   // orderId: order.id, // Razorpay order ID
  //   // amount: order.amount, // Amount in paisa
  //   // currency: order.currency,
  //   // razorpayOrderId: order.id,
  //   // url: order.short_url, // URL to redirect the user for payment
  //   url: order.url,
  // });
  





// import {mongooseConnect} from "@/lib/mongoose";
// import {Product} from "@/models/Product";
// import {Order} from "@/models/Order";
// const stripe = require('stripe')(process.env.STRIPE_SK);

// export default async function handler(req,res) {
//   if (req.method !== 'POST') {
//     res.json('should be a POST request');
//     return;
//   }
//   const {
//     name,email,city,
//     postalCode,streetAddress,country,
//     cartProducts,
//   } = req.body;
//   await mongooseConnect();
//   const productsIds = cartProducts;
//   const uniqueIds = [...new Set(productsIds)];
//   const productsInfos = await Product.find({_id:uniqueIds});

//   let line_items = [];
//   for (const productId of uniqueIds) {
//     const productInfo = productsInfos.find(p => p._id.toString() === productId);
//     const quantity = productsIds.filter(id => id === productId)?.length || 0;
//     if (quantity > 0 && productInfo) {
//       line_items.push({
//         quantity,
//         price_data: {
//           currency: 'USD',
//           product_data: {name:productInfo.title},
//           unit_amount: quantity * productInfo.price * 100,
//         },
//       });
//     }
//   }

//   const orderDoc = await Order.create({
//     line_items,name,email,city,postalCode,
//     streetAddress,country,paid:false,
//   });

//   const session = await stripe.checkout.sessions.create({
//     line_items,
//     mode: 'payment',
//     customer_email: email,
//     success_url: process.env.PUBLIC_URL + '/cart?success=1',
//     cancel_url: process.env.PUBLIC_URL + '/cart?canceled=1',
//     metadata: {orderId:orderDoc._id.toString(),test:'ok'},
//   });

//   res.json({
//     url:session.url,
//   })

}
import Razorpay from "razorpay";

const razor = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID as string||'jjjjjj',
  key_secret: process.env.RAZORPAY_KEY_SECRET as string||'kkkkkk',
});

export { razor };

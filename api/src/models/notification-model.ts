import { Schema, model, Document, Types } from "mongoose";

interface INotification extends Document {
  title: string;
  description: string;
  type: string;
  userId: Types.ObjectId;
  response?: string;
  isRead: boolean;
  orderId?: Types.ObjectId;
  demand?: string;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    response:{
      type:String
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    orderId: { 
      type: Schema.Types.ObjectId,
      ref: "Order"
    },
    demand: {
      type: String
    }
  },
  {
    timestamps: true,
  }
);

const NotificationModel = model<INotification>("Notification", notificationSchema);
export { NotificationModel, INotification };
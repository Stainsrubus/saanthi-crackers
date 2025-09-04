import { Schema, model, Document } from "mongoose";

interface INotification extends Document {
  title: string;
  description: string;
  type: string;
  isRead: boolean;
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
    response:{
      type:String
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const AdminNotificationModel = model<INotification>("AdminNotification", notificationSchema);
export { AdminNotificationModel, INotification };
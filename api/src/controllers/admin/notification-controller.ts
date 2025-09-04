import { sendNotification } from "@/lib/firebase";
import { User } from "@/models/user-model";
import Elysia, { t } from "elysia";
import { NotificationModel } from "../../models/notification-model";
import { AdminNotificationModel } from "@/models/adminNotification-model";

const notificationController = new Elysia({
  prefix: "/notification",
  detail: {
    tags: ["Admin - Notifications"],
  },
})
.post(
  "/create",
  async ({ body }) => {
    try {
      const { title, description, type, userId,demand } = body;
      const user = await User.findById(userId);
      if (!user) {
        return {
          message: "User not found",
          status: "error",
        };
      }

 await sendNotification(user.fcmToken, title, description, { type });
      const notification = await NotificationModel.create({
        title,
        description,
        type,
        userId,
        demand
      });

      return {
        message: "Notification Created Successfully",
        data: notification,
        status: "success",
      };
    } catch (error) {
      console.error(error);
      return {
        error,
        status: "error",
      };
    }
  },
  {
    body: t.Object({
      title: t.String(),
      description: t.String(),
      type: t.String(),
      userId: t.String(), 
      demand: t.String(), 
    }),
    detail: {
      summary: "Create a new notification",
    },
  }
)
  .get(
    "/all",
    async ({ query }) => {
      try {
        const { page, limit } = query;
        let _limit = Number(limit) || 4;
        let _page = Number(page) || 1;

        const notifications = await AdminNotificationModel.find()
          .skip((_page - 1) * _limit)
          .limit(_limit)
          .sort({ createdAt: -1 })
          .lean();

        const totalNotifications = await NotificationModel.countDocuments();
        const totalPages = Math.ceil(totalNotifications / _limit);
        const hasMore = notifications.length === _limit && _page < totalPages;

        return {
          notifications,
          currentPage: _page,
          totalPages,
          total: totalNotifications,
          hasMore,
          status: "success",
        };
      } catch (error: any) {
        console.log(error);
        return {
          error: error.message,
          status: "error",
        };
      }
    },
    {
      query: t.Object({
        page: t.Number({
          default: 1,
        }),
        limit: t.Number({
          default: 4,
        }),
      }),
      detail: {
        summary: "Get all notifications for the user",
      },
    }
  )
  .post(
    '/massnotifications',
    async ({ set, body }) => {
      try {
        let { title, message, users, type, mode } = body;
  
        // Validate input
        if (!title || !message) {
          set.status = 400;
          return { message: 'Title and message are required' };
        }
  
        if (mode === 'all') {
          const _users = await User.find({ 
            active: true, 
            fcmToken: { $exists: true, $ne: '' } 
          });
          users = _users.map((user) => user._id.toString());
        }
  
        const results = {
          total: users.length,
          success: 0,
          failures: 0,
          invalidTokens: 0,
          details: [] as Array<{
            userId: string;
            status: 'success'|'failure'|'invalid_token';
            error?: string;
          }>
        };
  
        // Process in batches
        const BATCH_SIZE = 100;
        for (let i = 0; i < users.length; i += BATCH_SIZE) {
          const batch = users.slice(i, i + BATCH_SIZE);
          
          await Promise.all(batch.map(async (userId) => {
            try {
              const _user = await User.findById(userId);
              if (!_user?.fcmToken) {
                results.details.push({ userId, status: 'invalid_token' });
                results.failures++;
                results.invalidTokens++;
                return;
              }
  
              const sent = await sendNotification(_user.fcmToken, title, message, { type })
                .catch(error => {
                  throw new Error(`FCM error: ${error.message}`);
                });
  
              if (sent) {
                await NotificationModel.create({
                  title,
                  description: message,
                  type,
                  userId: _user._id,
                });
                results.success++;
                results.details.push({ userId, status: 'success' });
              } else {
                await User.updateOne({ _id: userId }, { $unset: { fcmToken: '' } });
                results.failures++;
                results.invalidTokens++;
                results.details.push({ userId, status: 'invalid_token' });
              }
            } catch (error: any) {
              results.failures++;
              results.details.push({
                userId,
                status: 'failure',
                error: error.message
              });
              console.error(`Error processing ${userId}:`, error);
            }
          }));
        }
  
        if (results.success === 0) {
          set.status = 400;
          return {
            message: 'No notifications sent',
            results
          };
        }
  
        return {
          message: `Notifications processed (${results.success} success, ${results.failures} failures)`,
          results
        };
      } catch (error: any) {
        console.error('Mass notification error:', error);
        set.status = 500;
        return {
          message: 'Failed to process notifications',
          error: error.message
        };
      }
    },
    {
      body: t.Object({
        users: t.Array(t.String()),
        title: t.String(),
        message: t.String(),
        type: t.String({ default: 'promotion' }),
        mode: t.String({ default: 'selected' }),
      }),
    }
  )

export { notificationController };

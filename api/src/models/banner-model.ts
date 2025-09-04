import { Schema, model } from "mongoose";

interface BannerInterface {
  bannerImage: string;
  bannerTitle: string;
  bannerDescription: string;
  active: boolean;
}

const bannerSchema = new Schema<BannerInterface>(
  {
    bannerImage: {
      type: String,
      required: true,
    },
    bannerTitle: {
      type: String,
    },
    bannerDescription: {
      type: String,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Banner = model<BannerInterface>("Banner", bannerSchema);

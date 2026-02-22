import mongoose, { Schema, model, models } from "mongoose";

const DOC_ID = "global";

export interface ISiteSettings {
  _id: string;
  maintenanceMode: boolean;
  announcement: {
    message: string;
    active: boolean;
    updatedAt: Date;
    updatedBy?: string;
  };
  updatedAt: Date;
}

const siteSettingsSchema = new Schema<ISiteSettings>(
  {
    _id: { type: String, default: DOC_ID },
    maintenanceMode: { type: Boolean, default: false },
    announcement: {
      message: { type: String, default: "" },
      active: { type: Boolean, default: false },
      updatedAt: { type: Date, default: Date.now },
      updatedBy: { type: String },
    },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false, _id: true }
);

const SiteSettings = models.SiteSettings ?? model<ISiteSettings>("SiteSettings", siteSettingsSchema);
export default SiteSettings;
export { DOC_ID as SITE_SETTINGS_ID };

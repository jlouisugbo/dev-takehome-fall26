import { Schema, InferSchemaType, models, model, type Model } from "mongoose";
import { RequestStatus } from "@/lib/types/request";

const RequestSchema = new Schema({
  requestorName: { type: String, required: true, minlength: 3, maxlength: 30 },
  itemRequested: { type: String, required: true, minlength: 2, maxlength: 100 },
  requestCreatedDate: { type: Date, required: true },
  lastEditedDate: { type: Date, default: null },
  status: {
    type: String,
    enum: Object.values(RequestStatus),
    required: true,
  },
});

RequestSchema.index({ requestCreatedDate: -1 });
RequestSchema.index({ status: 1, requestCreatedDate: -1 });

export type RequestDoc = InferSchemaType<typeof RequestSchema>;

const RequestModel: Model<RequestDoc> = models.Request
  ? model<RequestDoc>("Request")
  : model<RequestDoc>("Request", RequestSchema, "requests");

export default RequestModel;
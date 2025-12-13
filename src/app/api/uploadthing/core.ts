import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const ourFileRouter = {
  customerDocuments: f({
    image: { maxFileSize: "16MB" },
    pdf: { maxFileSize: "16MB" },
  }).onUploadComplete(() => {}),
  productImages: f({
    image: { maxFileSize: "8MB", maxFileCount: 1 },
  }).onUploadComplete(() => {}),
  organizationLogo: f({
    image: { maxFileSize: "2MB", maxFileCount: 1 },
  }).onUploadComplete(() => {}),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;

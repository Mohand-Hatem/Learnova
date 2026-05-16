export const PLANS = {
  Free: {
    name: "Free",
    maxToken: 1000,
    price: 0,
  },
  Pro: {
    name: "Pro",
    maxToken: 2000,
    price: 500,
  },
  Enterprise: {
    name: "Enterprise",
    maxToken: 4000,
    price: 1000,
  },
};

export const IMAGE_FORMATS = ["jpg", "jpeg", "png"];

export const DOCUMENT_FORMATS = ["pdf", "doc", "docx"];

export const ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/jpg", "image/png"];

export const ALLOWED_DOC_MIMES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const MIME_TO_FILETYPE = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
};

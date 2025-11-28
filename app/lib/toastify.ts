"use client";
import { toast, ToastOptions } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export const defaultToastOptions: ToastOptions = {
  position: "top-center",
  autoClose: 4000,
  hideProgressBar: true,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  theme: "colored",
};

export const showToast = (
  type: "success" | "error" | "info",
  message: string,
) => {
  toast[type](message, defaultToastOptions);
};
